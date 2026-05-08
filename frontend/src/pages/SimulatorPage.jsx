import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import Card from "../components/Card";
import RiskBadge from "../components/RiskBadge";
import StudentForm from "../components/StudentForm";

const initial = { full_name: "Simulation", age: 17, gender: "unspecified", study_hours: 3, attendance: 70, physics_score: 62, chemistry_score: 66, math_score: 60, fee_status: true, parent_contact: "", course: "Science PCM", model_name: "catboost" };

export default function SimulatorPage() {
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const baseline = useMemo(() => ({ ...initial }), []);

  useEffect(() => {
    const id = setTimeout(async () => {
      const { data } = await api.post("/predict", form);
      setResult(data);
    }, 250);
    return () => clearTimeout(id);
  }, [form]);

  const baselineScore = 0.5;
  const delta = result ? Math.round((result.probability - baselineScore) * 100) : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">What-if Controls</h3>
        <StudentForm form={form} setForm={setForm} sliders />
        <button onClick={() => setForm(baseline)} className="mt-4 rounded-lg border border-line px-4 py-2 font-semibold text-slate-700">Reset</button>
      </Card>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Live Risk Simulation</h3>
        {result && (
          <div className="grid gap-5">
            <div className="rounded-lg bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Updated risk</p>
                <RiskBadge risk={result.risk_level} />
              </div>
              <p className="mt-3 text-5xl font-bold">{Math.round(result.probability * 100)}%</p>
              <p className={delta > 0 ? "mt-2 font-medium text-red-600" : "mt-2 font-medium text-emerald-700"}>{delta > 0 ? "+" : ""}{delta}% vs starting scenario</p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                <motion.div animate={{ width: `${result.probability * 100}%` }} className="h-full bg-coral" />
              </div>
            </div>
            {result.suggestions.map((item) => <div key={item} className="rounded-lg border border-line p-3 text-sm text-slate-600">{item}</div>)}
          </div>
        )}
      </Card>
    </div>
  );
}
