import { useEffect, useState } from "react";
import { Activity, BookOpen, Clock, Percent } from "lucide-react";
import { api } from "../services/api";
import MetricCard from "../components/MetricCard";
import Card from "../components/Card";
import RiskBadge from "../components/RiskBadge";
import { PerformanceLine, StudyPie, SubjectBars } from "../components/Charts";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: profile } = await api.get("/students/me");
      setStudent(profile);
      if (localStorage.getItem("studentDataEntered") === "true" && (profile.study_hours || profile.attendance || profile.physics_score || profile.chemistry_score || profile.math_score)) {
        const { data: pred } = await api.post("/predict", profile);
        setPrediction(pred);
      }
      const { data: hist } = await api.get("/predictions/history");
      setHistory(hist);
    }
    load();
  }, []);

  const trend = history.length
    ? history.map((item, index) => ({ week: `W${index + 1}`, performance: item.performance_score, risk: Math.round(item.probability * 100) }))
    : [];

  const riskTone = prediction?.risk_level === "High" ? "red" : prediction?.risk_level === "Medium" ? "yellow" : "green";

  return (
    <div className="grid gap-5">
      {!student && <Card><p className="text-slate-500">Loading student profile...</p></Card>}
      {student && !prediction && (
        <Card>
          <h3 className="mb-2 text-lg font-semibold">Enter Your Student Data</h3>
          <p className="text-slate-500">Open Predict, enter your attendance, study hours, and subject scores, then save the prediction to update this dashboard and the faculty dashboard.</p>
        </Card>
      )}
      {student && prediction && (
      <>
      {prediction?.warning && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">{prediction.warning}</div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Risk score" value={`${Math.round((prediction?.probability || 0) * 100)}%`} detail={<RiskBadge risk={prediction?.risk_level || "Low"} />} icon={Activity} tone={riskTone} />
        <MetricCard title="Performance" value={`${prediction?.performance_score || 0}%`} detail="Average subject score" icon={BookOpen} tone="blue" />
        <MetricCard title="Study hours" value={`${student.study_hours}h`} detail="Daily focused learning" icon={Clock} tone="green" />
        <MetricCard title="Attendance" value={`${student.attendance}%`} detail="Class participation" icon={Percent} tone="yellow" />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><PerformanceLine data={trend} /></div>
        <Card>
          <h3 className="mb-4 font-semibold">Explainable Insights</h3>
          <div className="space-y-3">
            {prediction?.top_features?.map((item) => (
              <div key={item.feature} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.feature}</p>
                  <span className={item.direction === "increases_risk" ? "text-red-600" : "text-emerald-700"}>{item.impact}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.advice}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <SubjectBars scores={student} />
        <StudyPie hours={student.study_hours} />
      </div>
      </>
      )}
    </div>
  );
}
