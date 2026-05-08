# Student Dropout Pridictor

Full-stack student early-warning platform with FastAPI, React, JWT auth, SQLite persistence, explainable ML-style predictions, SHAP feature impacts, faculty intervention views, notifications, messaging endpoints, and Gemini-powered mentoring.

## Project Structure

```text
frontend/  React + Vite + Tailwind + Framer Motion + Recharts
backend/   FastAPI + SQLAlchemy + JWT + Gemini integration
ml/        SHAP importance and model performance metadata
models/    Drop trained CatBoost, XGBoost, and Logistic Regression artifacts here
```

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API starts at `http://localhost:8000`. SQLite is used by default. Set `DATABASE_URL` to PostgreSQL if needed.

Gemini is optional. Add `GEMINI_API_KEY` in `backend/.env`; without it, `/chat` returns a local mentor response based on the ML prediction and suggestions.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app starts at `http://localhost:5173`.

## Demo Accounts

```text
Student: student@example.com / password123
Faculty: faculty@example.com / password123
```

## Model Artifacts

Place trained files in `/models`:

- `catboost.cbm` or `catboost.pkl`
- `xgboost.json` or `xgboost.pkl`
- `logistic_regression.pkl`

When present, the backend calls `predict_proba()`. When absent, it uses a deterministic fallback risk model so the app remains runnable.

For native ML artifact serving, install optional ML packages after choosing a compatible Python version, preferably Python 3.11 or 3.12:

```bash
pip install -r backend/requirements-ml.txt
```

## Key APIs

- `POST /auth/signup`
- `POST /auth/login`
- `POST /predict`
- `POST /batch_predict`
- `GET /predictions/history`
- `POST /chat`
- `GET /students`
- `POST /messages`
- `GET /notifications`

## Notes

The included `ml/model_performance.csv` and `ml/shap_importance.csv` are derived from the provided paper outputs. The frontend assets include the supplied ROC, SHAP, dependence, and confusion-matrix figures under `frontend/public/assets`.
