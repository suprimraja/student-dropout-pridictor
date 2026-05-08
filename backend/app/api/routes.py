import json
from csv import DictReader
from io import StringIO
from statistics import mean

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_faculty
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.ml.predictor import prediction_service
from app.models.entities import Message, Notification, Prediction, Student, User
from app.schemas.schemas import (
    ChatRequest,
    ChatResponse,
    BulkAnalysisResponse,
    BulkStudentAnalysis,
    InterventionCreate,
    MessageCreate,
    MessageOut,
    PredictionOut,
    PredictionRequest,
    StudentInput,
    StudentOut,
    TokenOut,
    UserCreate,
    UserLogin,
)

router = APIRouter()


FIELD_ALIASES = {
    "full_name": ["full_name", "name", "student", "student_name"],
    "study_hours": ["study_hours", "study hours", "study_hours_per_day", "hours"],
    "attendance": ["attendance", "attendance_%", "attendance_percent", "attendance_percentage"],
    "physics_score": ["physics_score", "physics", "physics marks", "physics_score"],
    "chemistry_score": ["chemistry_score", "chemistry", "chemistry marks", "chemistry_score"],
    "math_score": ["math_score", "math", "maths", "mathematics", "math_score"],
    "fee_status": ["fee_status", "fees_paid", "tuition_fees_up_to_date", "fee paid"],
    "age": ["age", "age_at_enrollment"],
}


def student_to_features(student: Student | StudentInput | PredictionRequest) -> dict:
    return {
        "study_hours": student.study_hours,
        "attendance": student.attendance,
        "physics_score": student.physics_score,
        "chemistry_score": student.chemistry_score,
        "math_score": student.math_score,
        "fee_status": student.fee_status,
        "age": student.age,
    }


def _clean_key(key: str) -> str:
    return key.strip().lower().replace("-", "_")


def _row_value(row: dict, canonical: str, default=None):
    normalized = {_clean_key(key): value for key, value in row.items()}
    for alias in FIELD_ALIASES[canonical]:
        key = _clean_key(alias)
        if key in normalized and str(normalized[key]).strip() != "":
            return normalized[key]
    return default


def _as_float(value, default: float) -> float:
    try:
        return float(str(value).strip().replace("%", ""))
    except (TypeError, ValueError):
        return default


def _as_bool(value, default: bool = True) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "paid", "up to date", "updated"}


def _parse_student_rows(csv_text: str) -> list[PredictionRequest]:
    reader = DictReader(StringIO(csv_text.strip()))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV must include a header row")
    students: list[PredictionRequest] = []
    for index, row in enumerate(reader, start=1):
        students.append(
            PredictionRequest(
                full_name=str(_row_value(row, "full_name", f"Student {index}")).strip() or f"Student {index}",
                age=int(_as_float(_row_value(row, "age", 17), 17)),
                study_hours=_as_float(_row_value(row, "study_hours", 4), 4),
                attendance=_as_float(_row_value(row, "attendance", 80), 80),
                physics_score=_as_float(_row_value(row, "physics_score", 70), 70),
                chemistry_score=_as_float(_row_value(row, "chemistry_score", 70), 70),
                math_score=_as_float(_row_value(row, "math_score", 70), 70),
                fee_status=_as_bool(_row_value(row, "fee_status", True), True),
                course="Bulk Upload",
            )
        )
    return students


def _bulk_recommendations(results: list[dict]) -> list[str]:
    high = [item for item in results if item["risk_level"] == "High"]
    low_attendance = [item for item in results if item["source"].attendance < 75]
    weak_math = [item for item in results if item["source"].math_score < 65]
    actions = []
    if high:
        actions.append(f"Schedule faculty intervention for {len(high)} high-risk students within 48 hours.")
    if low_attendance:
        actions.append(f"Run an attendance recovery drive for {len(low_attendance)} students below 75%.")
    if weak_math:
        actions.append(f"Create a remedial Math problem-solving batch for {len(weak_math)} students scoring below 65.")
    if not actions:
        actions.append("Class risk is stable; continue weekly monitoring and mock-test review.")
    return actions


def _student_context(student: Student, result: dict) -> str:
    weak_subjects = sorted(
        [("Physics", student.physics_score), ("Chemistry", student.chemistry_score), ("Math", student.math_score)],
        key=lambda item: item[1],
    )
    drivers = ", ".join(f"{item['feature']} ({item['direction'].replace('_', ' ')})" for item in result["top_features"][:4])
    return (
        f"Risk: {result['risk_level']} ({result['probability']:.0%}); "
        f"performance: {result['performance_score']}%; "
        f"study hours: {student.study_hours}/day; attendance: {student.attendance}%; "
        f"scores: Physics {student.physics_score}, Chemistry {student.chemistry_score}, Math {student.math_score}; "
        f"weakest subjects: {weak_subjects[0][0]}, {weak_subjects[1][0]}; "
        f"top drivers: {drivers}."
    )


def _local_mentor_reply(message: str, student: Student, result: dict) -> str:
    text = message.lower()
    weak_subjects = sorted(
        [("Physics", student.physics_score), ("Chemistry", student.chemistry_score), ("Math", student.math_score)],
        key=lambda item: item[1],
    )
    weakest, weakest_score = weak_subjects[0]
    second, _ = weak_subjects[1]
    risk_line = f"Your current predicted risk is {result['risk_level']} at {result['probability']:.0%}, with an average performance of {result['performance_score']}%."

    if any(word in text for word in ["hello", "hi", "hey"]):
        return (
            f"Hi. I have your latest profile in view. {risk_line}\n\n"
            f"The main thing I would watch today is {weakest}, because it is your lowest score at {weakest_score}.\n\n"
            "Ask me for a plan, subject strategy, attendance recovery, mock-test review, or a daily timetable and I will tailor it to your numbers."
        )
    if any(word in text for word in ["math", "maths", "mathematics"]):
        return (
            f"{risk_line}\n\n"
            f"For Math specifically, your score is {student.math_score}. Use a three-block routine for the next 7 days:\n"
            "1. 25 minutes: revise formulas and solved examples from one topic.\n"
            "2. 45 minutes: solve timed mixed questions without looking at solutions.\n"
            "3. 20 minutes: write an error log with the reason for each miss.\n\n"
            "Start with the topic where your last mock test lost the most marks, then rotate Algebra, Calculus, and Coordinate Geometry."
        )
    if any(word in text for word in ["physics", "chemistry"]):
        subject = "Physics" if "physics" in text else "Chemistry"
        score = student.physics_score if subject == "Physics" else student.chemistry_score
        method = "formula recall plus timed numericals" if subject == "Physics" else "NCERT fact recall plus reaction/concept mapping"
        return (
            f"{risk_line}\n\n"
            f"For {subject}, your score is {score}. The best next move is {method}.\n"
            f"Do two focused sessions today: first close theory gaps, then attempt 30 questions from only {subject}. Mark every error as concept, calculation, or time-pressure."
        )
    if any(word in text for word in ["attendance", "class", "absent"]):
        return (
            f"{risk_line}\n\n"
            f"Attendance is {student.attendance}%. If it stays below 75%, risk monitoring will keep treating it as a warning signal.\n"
            "Action plan: attend all problem-solving classes this week, ask faculty for missed worksheets, and use one 30-minute recap slot each evening for topics covered in class."
        )
    if any(word in text for word in ["plan", "timetable", "schedule", "week", "7-day", "7 day"]):
        return (
            f"{risk_line}\n\n"
            f"7-day plan:\n"
            f"Day 1-2: {weakest} fundamentals and error-log revision.\n"
            f"Day 3: {second} targeted practice.\n"
            "Day 4: mixed Physics-Chemistry-Math timed set.\n"
            "Day 5: review only mistakes and weak formulas.\n"
            "Day 6: full mock test.\n"
            "Day 7: analyze mock test, redo wrong questions, and set next week priorities.\n\n"
            f"Keep daily study at {max(4.5, student.study_hours + 1):.1f} focused hours for this week."
        )
    if any(word in text for word in ["why", "risk", "drop", "fail", "low"]):
        drivers = "\n".join(f"- {item['feature']}: {item['advice']}" for item in result["top_features"][:4])
        return (
            f"{risk_line}\n\n"
            "The model is reacting mostly to these signals:\n"
            f"{drivers}\n\n"
            f"The fastest improvement path is to protect attendance, raise daily study consistency, and lift {weakest} first."
        )
    if any(word in text for word in ["mock", "test", "exam", "jee"]):
        return (
            f"{risk_line}\n\n"
            "For JEE prep, use mocks as diagnosis, not just scoring. After every mock, split mistakes into concept gaps, careless errors, and slow questions. "
            f"Because your weakest area is {weakest}, reserve the first post-mock review block for that subject."
        )

    suggestions = "\n".join(f"- {item}" for item in result["suggestions"])
    return (
        f"{risk_line}\n\n"
        f"Based on your question, I would focus on {weakest} first and keep {second} warm with short daily practice.\n\n"
        f"Recommended next actions:\n{suggestions}\n\n"
        "Send me a specific topic, recent mock score, or the exact problem you are stuck on, and I will make the answer more precise."
    )


def store_prediction(db: Session, student_id: int, result: dict) -> None:
    db.add(
        Prediction(
            student_id=student_id,
            model_name=result["model_name"],
            probability=result["probability"],
            risk_level=result["risk_level"],
            performance_score=result["performance_score"],
            top_features_json=json.dumps(result["top_features"]),
        )
    )
    if result["probability"] > 0.7:
        student = db.query(Student).filter(Student.id == student_id).first()
        if student:
            db.add(
                Notification(
                    user_id=student.user_id,
                    title="High risk warning",
                    body="Your latest prediction crossed the 70% risk threshold. Please review the action plan.",
                    severity="critical",
                )
            )
    db.commit()


@router.post("/auth/signup", response_model=TokenOut)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=payload.email, role=payload.role, full_name=payload.full_name, password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    if payload.role == "student":
        db.add(Student(user_id=user.id, full_name=payload.full_name))
    db.commit()
    token = create_access_token(user.email, user.role)
    return TokenOut(access_token=token, role=user.role, user_id=user.id, full_name=user.full_name)


@router.post("/auth/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.email, user.role)
    return TokenOut(access_token=token, role=user.role, user_id=user.id, full_name=user.full_name)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role, "full_name": user.full_name}


@router.get("/students/me", response_model=StudentOut)
def get_my_student(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.put("/students/me", response_model=StudentOut)
def update_my_student(payload: StudentInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        student = Student(user_id=user.id, full_name=payload.full_name)
        db.add(student)
    for key, value in payload.model_dump().items():
        setattr(student, key, value)
    db.commit()
    db.refresh(student)
    return student


@router.get("/students")
def list_students(db: Session = Depends(get_db), _: User = Depends(require_faculty)):
    students = db.query(Student).all()
    rows = []
    for student in students:
        latest = db.query(Prediction).filter(Prediction.student_id == student.id).order_by(Prediction.created_at.desc()).first()
        result = prediction_service.predict(student_to_features(student))
        latest_prediction = (
            {
                "probability": latest.probability,
                "risk_level": latest.risk_level,
                "performance_score": latest.performance_score,
                "model_name": latest.model_name,
                "created_at": latest.created_at,
            }
            if latest
            else result
        )
        rows.append({"student": StudentOut.model_validate(student), "latest_prediction": latest_prediction})
    return rows


@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), _: User = Depends(require_faculty)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    user = db.query(User).filter(User.id == student.user_id).first()
    db.query(Prediction).filter(Prediction.student_id == student.id).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.user_id == student.user_id).delete(synchronize_session=False)
    db.query(Message).filter(Message.sender_id == student.user_id).delete(synchronize_session=False)
    db.query(Message).filter(Message.receiver_id == student.user_id).delete(synchronize_session=False)
    db.delete(student)
    if user and user.role == "student":
        db.delete(user)
    db.commit()
    return {"detail": "Student removed from database"}


@router.post("/predict", response_model=PredictionOut)
def predict(payload: PredictionRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    result = prediction_service.predict(student_to_features(payload), payload.model_name)
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if student and user.role == "student":
        store_prediction(db, student.id, result)
    return result


@router.post("/batch_predict")
def batch_predict(payload: list[PredictionRequest], _: User = Depends(require_faculty)):
    return [prediction_service.predict(student_to_features(item), item.model_name) for item in payload]


@router.post("/faculty/bulk_analyze", response_model=BulkAnalysisResponse)
async def bulk_analyze_students(
    file: UploadFile | None = File(default=None),
    csv_text: str | None = Form(default=None),
    _: User = Depends(require_faculty),
):
    if file:
        raw = (await file.read()).decode("utf-8-sig")
    elif csv_text and csv_text.strip():
        raw = csv_text
    else:
        raise HTTPException(status_code=400, detail="Upload a CSV file or paste CSV text")

    students = _parse_student_rows(raw)
    if not students:
        raise HTTPException(status_code=400, detail="No student rows found")

    result_rows = []
    enriched = []
    for row_number, student in enumerate(students, start=1):
        prediction = prediction_service.predict(student_to_features(student), student.model_name)
        top_driver = prediction["top_features"][0]["feature"] if prediction["top_features"] else "Overall profile"
        enriched.append({**prediction, "source": student})
        result_rows.append(
            BulkStudentAnalysis(
                row_number=row_number,
                full_name=student.full_name,
                study_hours=student.study_hours,
                attendance=student.attendance,
                physics_score=student.physics_score,
                chemistry_score=student.chemistry_score,
                math_score=student.math_score,
                probability=prediction["probability"],
                risk_level=prediction["risk_level"],
                performance_score=prediction["performance_score"],
                top_driver=top_driver,
                suggestions=prediction["suggestions"],
            )
        )

    probabilities = [item.probability for item in result_rows]
    performance = [item.performance_score for item in result_rows]
    return BulkAnalysisResponse(
        total_students=len(result_rows),
        high_risk=sum(1 for item in result_rows if item.risk_level == "High"),
        medium_risk=sum(1 for item in result_rows if item.risk_level == "Medium"),
        low_risk=sum(1 for item in result_rows if item.risk_level == "Low"),
        average_probability=round(mean(probabilities), 4),
        average_performance=round(mean(performance), 1),
        recommended_actions=_bulk_recommendations(enriched),
        students=sorted(result_rows, key=lambda item: item.probability, reverse=True),
    )


@router.get("/predictions/history")
def prediction_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        return []
    return [
        {
            "probability": p.probability,
            "risk_level": p.risk_level,
            "performance_score": p.performance_score,
            "created_at": p.created_at,
        }
        for p in db.query(Prediction).filter(Prediction.student_id == student.id).order_by(Prediction.created_at.asc()).all()
    ]


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).all()


@router.post("/faculty/interventions")
def create_intervention(payload: InterventionCreate, db: Session = Depends(get_db), faculty: User = Depends(require_faculty)):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    details = f"{faculty.full_name or 'Faculty'} selected: {payload.action}."
    if payload.notes.strip():
        details = f"{details} {payload.notes.strip()}"

    notification = Notification(
        user_id=student.user_id,
        title="Faculty intervention update",
        body=details,
        severity="info",
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/messages", response_model=MessageOut)
def send_message(payload: MessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    message = Message(sender_id=user.id, receiver_id=payload.receiver_id, message=payload.message)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/messages", response_model=list[MessageOut])
def messages(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Message).filter((Message.sender_id == user.id) | (Message.receiver_id == user.id)).order_by(Message.created_at.asc()).all()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == payload.student_id).first() if payload.student_id else db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    result = prediction_service.predict(student_to_features(student))
    history_text = "\n".join(f"{item.get('role', 'user')}: {item.get('text', '')}" for item in payload.history[-8:])
    context = _student_context(student, result)
    prompt = (
        "You are an expert JEE preparation mentor and academic risk coach. "
        "Answer like a helpful ChatGPT-style tutor: conversational, specific, and concise. "
        "Use the student's data, avoid generic repetition, and adapt to the user's exact question.\n\n"
        f"Student context: {context}\n\n"
        f"Recent conversation:\n{history_text or 'No prior turns.'}\n\n"
        f"Student question:\n{payload.message}\n\n"
        "Respond with practical reasoning, personalized suggestions, and an action plan when useful."
    )
    settings = get_settings()
    if settings.groq_api_key:
        import httpx

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "messages": [
                        {"role": "system", "content": "You are an expert JEE preparation mentor and academic risk coach. Be conversational, specific, and concise."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.5,
                    "max_tokens": 700,
                },
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
            return ChatResponse(response=text, provider="groq")
    if settings.gemini_api_key:
        import httpx

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            response.raise_for_status()
            text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            return ChatResponse(response=text, provider="gemini")
    return ChatResponse(response=_local_mentor_reply(payload.message, student, result), provider="local-context")
