from __future__ import annotations

import csv
import math
from pathlib import Path
from typing import Any

from app.ml.suggestions import build_suggestions


ROOT = Path(__file__).resolve().parents[3]
MODELS_DIR = ROOT / "models"
SHAP_CSV = ROOT / "ml" / "shap_importance.csv"


FEATURE_ORDER = [
    "study_hours",
    "attendance",
    "physics_score",
    "chemistry_score",
    "math_score",
    "fee_status",
    "age",
]


class PredictionService:
    def __init__(self) -> None:
        self.models: dict[str, Any] = {}
        self.shap_importance = self._load_shap_importance()
        self._load_models()

    def _load_shap_importance(self) -> list[dict]:
        if not SHAP_CSV.exists():
            return []
        with SHAP_CSV.open() as file:
            return list(csv.DictReader(file))

    def _load_models(self) -> None:
        candidates = {
            "catboost": ["catboost.cbm", "catboost.pkl"],
            "xgboost": ["xgboost.json", "xgboost.pkl"],
            "logistic_regression": ["logistic_regression.pkl"],
        }
        for name, files in candidates.items():
            for file_name in files:
                path = MODELS_DIR / file_name
                if path.exists():
                    self.models[name] = self._load_model_file(path)
                    break

    def _load_model_file(self, path: Path) -> Any:
        if path.suffix == ".cbm":
            from catboost import CatBoostClassifier

            model = CatBoostClassifier()
            model.load_model(str(path))
            return model
        if path.suffix == ".json":
            from xgboost import XGBClassifier

            model = XGBClassifier()
            model.load_model(str(path))
            return model
        import joblib

        return joblib.load(path)

    def predict(self, features: dict, model_name: str = "catboost") -> dict:
        model = self.models.get(model_name)
        if model:
            import numpy as np

            x = np.array([[features[key] for key in FEATURE_ORDER]], dtype=float)
            probability = float(model.predict_proba(x)[0][1])
        else:
            probability = self._fallback_probability(features)

        probability = max(0, min(1, probability))
        risk_level = self._risk_level(probability)
        top_features = self._feature_impacts(features)
        performance_score = round((features["physics_score"] + features["chemistry_score"] + features["math_score"]) / 3, 1)
        suggestions = build_suggestions(features, top_features)
        return {
            "probability": round(probability, 4),
            "risk_level": risk_level,
            "performance_score": performance_score,
            "top_features": top_features,
            "suggestions": suggestions,
            "warning": "High dropout/failure risk detected. Faculty intervention is recommended." if probability > 0.7 else None,
            "model_name": model_name if model else f"{model_name}-fallback",
        }

    def _fallback_probability(self, features: dict) -> float:
        avg_score = (features["physics_score"] + features["chemistry_score"] + features["math_score"]) / 3
        fee_penalty = 0 if features["fee_status"] else 0.65
        z = (
            2.8
            - 0.36 * features["study_hours"]
            - 0.035 * features["attendance"]
            - 0.032 * avg_score
            - 0.018 * features["math_score"]
            + 0.035 * max(features["age"] - 17, 0)
            + fee_penalty
        )
        return 1 / (1 + math.exp(-z))

    def _risk_level(self, probability: float) -> str:
        if probability < 0.3:
            return "Low"
        if probability <= 0.6:
            return "Medium"
        return "High"

    def _feature_impacts(self, features: dict) -> list[dict]:
        raw = [
            ("Attendance", features["attendance"], (75 - features["attendance"]) / 35, "Attend weak-topic classes and labs this week."),
            ("Study hours", features["study_hours"], (4.5 - features["study_hours"]) / 4, "Add a daily problem-solving block before new theory."),
            ("Math score", features["math_score"], (68 - features["math_score"]) / 45, "Practice 25 mixed Math questions from recent mistakes."),
            ("Physics score", features["physics_score"], (66 - features["physics_score"]) / 45, "Revise Physics concepts through formula recall and timed numericals."),
            ("Chemistry score", features["chemistry_score"], (66 - features["chemistry_score"]) / 45, "Use active recall for Chemistry reactions and NCERT facts."),
            ("Tuition fees up to date", features["fee_status"], -0.25 if features["fee_status"] else 0.45, "Resolve fee continuity to avoid disruption."),
        ]
        impacts = []
        for feature, value, impact, advice in raw:
            impacts.append(
                {
                    "feature": feature,
                    "value": value,
                    "impact": round(float(impact), 3),
                    "direction": "increases_risk" if impact > 0 else "reduces_risk",
                    "advice": advice,
                }
            )
        return sorted(impacts, key=lambda item: abs(item["impact"]), reverse=True)[:5]


prediction_service = PredictionService()
