import { useEffect, useState } from "react";
import { api } from "../services/api";
import Card from "../components/Card";
import RiskBadge from "../components/RiskBadge";
import StudentForm from "../components/StudentForm";
import { subjectLabelForFeature } from "../utils/courses";

const emptyProfile = { full_name: "", age: 17, gender: "unspecified", study_hours: "", attendance: "", physics_score: "", chemistry_score: "", math_score: "", fee_status: true, parent_contact: "", course: "", model_name: "catboost" };
const requiredFields = ["full_name", "course", "study_hours", "attendance", "physics_score", "chemistry_score", "math_score"];

export default function PredictionPage() {
  const [form, setForm] = useState(emptyProfile);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/students/me").then(({ data }) => {
      setForm((current) => ({ ...current, full_name: data.full_name || "", parent_contact: data.parent_contact || "", model_name: "catboost" }));
    }).catch(() => {});
  }, []);

  const payloadFromForm = () => ({
    ...form,
    full_name: form.full_name.trim(),
    course: form.course.trim(),
    study_hours: Number(form.study_hours),
    attendance: Number(form.attendance),
    physics_score: Number(form.physics_score),
    chemistry_score: Number(form.chemistry_score),
    math_score: Number(form.math_score),
    age: Number(form.age) || 17
  });

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    const missing = requiredFields.filter((key) => form[key] === "" || String(form[key]).trim() === "");
    if (missing.length) {
      setMessage("Please enter all student details before running prediction.");
      return;
    }
    setSaving(true);
    try {
      const profilePayload = payloadFromForm();
      const { data: savedProfile } = await api.put("/students/me", profilePayload);
      const { data } = await api.post("/predict", { ...savedProfile, model_name: form.model_name });
      localStorage.setItem("studentDataEntered", "true");
      setResult(data);
      setMessage("Student data saved. Dashboards are updated with the latest values.");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Could not save student data.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Student Input</h3>
        <form onSubmit={submit} className="grid gap-4">
          <StudentForm form={form} setForm={setForm} />
          <label className="grid gap-1 text-sm font-medium text-slate-600">Model
            <select className="rounded-lg border border-line px-3 py-2" value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })}>
              <option value="catboost">CatBoost</option>
              <option value="xgboost">XGBoost</option>
              <option value="logistic_regression">Logistic Regression</option>
            </select>
          </label>
          {message && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal">{message}</p>}
          <button className="rounded-lg bg-ink px-4 py-3 font-semibold text-white">{saving ? "Saving..." : "Save & Run Prediction"}</button>
        </form>
      </Card>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Prediction Result</h3>
        {result ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-sm text-slate-500">Failure risk probability</p>
                <p className="text-4xl font-bold">{Math.round(result.probability * 100)}%</p>
              </div>
              <RiskBadge risk={result.risk_level} />
            </div>
            <div className="grid gap-3">
              {result.top_features.map((item) => (
                <div key={item.feature} className="rounded-lg border border-line p-3">
                  <div className="flex justify-between gap-3"><b>{subjectLabelForFeature(item.feature, form.course)}</b><span>{item.direction.replace("_", " ")}</span></div>
                  <p className="mt-1 text-sm text-slate-500">{item.advice}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Suggestions</h4>
              <ul className="grid gap-2 text-sm text-slate-600">{result.suggestions.map((item) => <li className="rounded-lg bg-teal-50 p-3" key={item}>{item}</li>)}</ul>
            </div>
          </div>
        ) : <p className="text-slate-500">Run a prediction to see risk, SHAP-style drivers, and interventions.</p>}
      </Card>
    </div>
  );
}
