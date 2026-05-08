# Model Artifacts

Place trained models here:

- `catboost.cbm` or `catboost.pkl`
- `xgboost.json` or `xgboost.pkl`
- `logistic_regression.pkl`

The backend uses `predict_proba()` when a model is present. Without artifacts, it runs a calibrated deterministic fallback so the application remains demo-ready.
