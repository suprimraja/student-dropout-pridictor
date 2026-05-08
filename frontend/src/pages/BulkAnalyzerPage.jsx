import { useState } from "react";
import { ClipboardList, FileUp } from "lucide-react";
import { api } from "../services/api";
import Card from "../components/Card";
import RiskBadge from "../components/RiskBadge";

const sampleCsv = `full_name,study_hours,attendance,physics_score,chemistry_score,math_score,fee_status,age
Neha Rao,2.5,64,55,61,48,true,17
Arjun Nair,5.5,88,76,72,81,true,17
Sara Khan,3.2,71,64,58,60,false,18`;

export default function BulkAnalyzerPage() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [uploadName, setUploadName] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const analyzeBulk = async (file) => {
    setAnalyzing(true);
    setError("");
    try {
      const form = new FormData();
      if (file) {
        form.append("file", file);
        setUploadName(file.name);
      } else {
        form.append("csv_text", csvText);
      }
      const { data } = await api.post("/faculty/bulk_analyze", form, { headers: { "Content-Type": "multipart/form-data" } });
      setBulkResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not analyze data");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-line bg-ink p-5 text-white shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Bulk Student Analyzer</p>
        <h2 className="mt-1 text-2xl font-bold">Score an entire cohort from CSV data</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">Upload a CSV or paste student rows to identify high-risk learners, top risk drivers, and faculty action priorities.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 text-teal"><FileUp size={20} /></div>
            <div>
              <h3 className="font-semibold">Input Data</h3>
              <p className="text-sm text-slate-500">CSV upload or pasted cohort table</p>
            </div>
          </div>
          <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:bg-slate-100">
            <FileUp className="mb-2 text-teal" />
            <span className="font-semibold">{uploadName || "Upload CSV file"}</span>
            <span className="mt-1 text-sm text-slate-500">Required columns: name, study hours, attendance, Physics, Chemistry, Math</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && analyzeBulk(e.target.files[0])} />
          </label>
          <textarea
            className="h-56 w-full rounded-lg border border-line bg-white p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-teal/20"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button onClick={() => analyzeBulk()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-3 font-semibold text-white">
            <ClipboardList size={18} /> {analyzing ? "Analyzing..." : "Analyze pasted data"}
          </button>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Analysis Results</h3>
          {bulkResult ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3"><b>{bulkResult.total_students}</b><span className="block text-xs text-slate-500">Students</span></div>
                <div className="rounded-lg bg-red-50 p-3 text-red-700"><b>{bulkResult.high_risk}</b><span className="block text-xs">High</span></div>
                <div className="rounded-lg bg-amber-50 p-3 text-amber-700"><b>{bulkResult.medium_risk}</b><span className="block text-xs">Medium</span></div>
                <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700"><b>{bulkResult.low_risk}</b><span className="block text-xs">Low</span></div>
              </div>
              <div className="rounded-lg bg-teal-50 p-4">
                <p className="font-semibold text-teal">Recommended faculty actions</p>
                <ul className="mt-2 grid gap-2 text-sm text-slate-700">{bulkResult.recommended_actions.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="max-h-96 overflow-auto rounded-lg border border-line">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="sticky top-0 bg-white text-slate-500"><tr><th className="p-3">Student</th><th>Risk</th><th>Probability</th><th>Performance</th><th>Top driver</th><th>Suggestion</th></tr></thead>
                  <tbody>
                    {bulkResult.students.map((student) => (
                      <tr key={`${student.row_number}-${student.full_name}`} className="border-t border-line">
                        <td className="p-3 font-medium">{student.full_name}</td>
                        <td><RiskBadge risk={student.risk_level} /></td>
                        <td>{Math.round(student.probability * 100)}%</td>
                        <td>{student.performance_score}%</td>
                        <td>{student.top_driver}</td>
                        <td className="max-w-xs text-slate-500">{student.suggestions[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <p className="text-sm text-slate-500">Analyze a CSV to see cohort risk distribution, top drivers, and intervention recommendations.</p>}
        </Card>
      </div>
    </div>
  );
}
