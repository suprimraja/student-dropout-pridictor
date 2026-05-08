from app.core.security import hash_password
from app.models.entities import Prediction, Student, User


def seed_demo_data(db):
    if db.query(User).first():
        return
    faculty = User(email="faculty@example.com", role="faculty", full_name="Dr. Meera Sharma", password_hash=hash_password("password123"))
    students = [
        User(email="student@example.com", role="student", full_name="Aarav Mehta", password_hash=hash_password("password123")),
        User(email="riya@example.com", role="student", full_name="Riya Kapoor", password_hash=hash_password("password123")),
        User(email="kabir@example.com", role="student", full_name="Kabir Singh", password_hash=hash_password("password123")),
    ]
    db.add(faculty)
    db.add_all(students)
    db.flush()
    profiles = [
        Student(user_id=students[0].id, full_name="Aarav Mehta"),
        Student(user_id=students[1].id, full_name="Riya Kapoor"),
        Student(user_id=students[2].id, full_name="Kabir Singh"),
    ]
    db.add_all(profiles)
    db.commit()
