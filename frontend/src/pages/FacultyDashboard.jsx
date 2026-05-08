import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageSquare, Search, ShieldAlert, Trash2, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../services/api";
import Card from "../components/Card";
import RiskBadge from "../components/RiskBadge";
import MetricCard from "../components/MetricCard";

const interventionActions = [
  "Schedule one-to-one mentoring",
  "Assign remedial practice plan",
  "Call parent or guardian",
  "Create attendance recovery plan"
];

export default function FacultyDashboard() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedActions, setSelectedActions] = useState({});
  const [interveningId, setInterveningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState("");

  const loadStudents = () => api.get("/students").then(({ data }) => setRows(data));
  useEffect(() => { loadStudents(); }, []);

  const normalized = rows.map((row) => ({
    ...row.student,
    probability: row.latest_prediction.probability ?? 0,
    risk_level: row.latest_prediction.risk_level ?? "Low",
    performance_score: row.latest_prediction.performance_score ?? 0
  }));

  const visible = normalized
    .filter((row) => filter === "All" || row.risk_level === filter)
    .filter((row) => row.full_name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.probability - a.probability);

  const distribution = ["Low", "Medium", "High"].map((risk) => ({ risk, value: normalized.filter((row) => row.risk_level === risk).length }));
  const averagePerformance = useMemo(() => normalized.length ? Math.round(normalized.reduce((sum, item) => sum + item.performance_score, 0) / normalized.length) : 0, [normalized]);

  const createIntervention = async (student) => {
    const action = selectedActions[student.id] || interventionActions[0];
    setInterveningId(student.id);
    setNotice("");
    try {
      await api.post("/faculty/interventions", {
        student_id: student.id,
        action,
        notes: `Current risk is ${student.risk_level} at ${Math.round(student.probability * 100)}%.`
      });
      setNotice(`Intervention sent to ${student.full_name}'s Alerts tab.`);
    } catch (err) {
      setNotice(err.response?.data?.detail || "Could not create intervention alert.");
    } finally {
      setInterveningId(null);
    }
  };

  const deleteStudent = async (student) => {
    const confirmed = window.confirm(`Remove ${student.full_name} from the database? This will delete the student account, profile, predictions, alerts, and messages.`);
    if (!confirmed) return;
    setDeletingId(student.id);
    setNotice("");
    try {
      await api.delete(`/students/${student.id}`);
      setRows((current) => current.filter((row) => row.student.id !== student.id));
      setSelectedActions((current) => {
        const next = { ...current };
        delete next[student.id];
        return next;
      });
      setNotice(`${student.full_name} removed from the database.`);
    } catch (err) {
      setNotice(err.response?.data?.detail || "Could not remove student.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-line bg-ink p-5 text-white shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Faculty Command Center</p>
            <h2 className="mt-1 text-2xl font-bold">Risk monitoring and student intervention</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-200">Review active profiles, identify high-risk students, and send intervention updates directly to each student's Alerts tab.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/10 px-4 py-3"><b>{normalized.length}</b><span className="block text-xs text-slate-200">Profiles</span></div>
            <div className="rounded-lg bg-white/10 px-4 py-3"><b>{normalized.filter((item) => item.risk_level === "High").length}</b><span className="block text-xs text-slate-200">High risk</span></div>
            <div className="rounded-lg bg-white/10 px-4 py-3"><b>{averagePerformance}%</b><span className="block text-xs text-slate-200">Avg perf.</span></div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Students monitored" value={normalized.length} detail="Active database profiles" icon={Users} tone="blue" />
        <MetricCard title="High risk" value={normalized.filter((item) => item.risk_level === "High").length} detail="Need immediate review" icon={ShieldAlert} tone="red" />
        <MetricCard title="Class performance" value={`${averagePerformance}%`} detail="Mean score across class" icon={TrendingUp} tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart><Pie data={distribution} dataKey="value" nameKey="risk" outerRadius={90} label>{distribution.map((item) => <Cell key={item.risk} fill={item.risk === "High" ? "#e85d4f" : item.risk === "Medium" ? "#d89b00" : "#0f766e"} />)}</Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Class Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={normalized}><XAxis dataKey="full_name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="performance_score" radius={[6, 6, 0, 0]} fill="#0f766e" /></BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Student Monitoring</h3>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-500">
              <Search size={16} /><input className="outline-none" placeholder="Search student" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="flex rounded-lg bg-slate-100 p-1">
              {["All", "Low", "Medium", "High"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${filter === item ? "bg-white text-ink shadow" : "text-slate-500"}`}>{item}</button>)}
            </div>
          </div>
        </div>
        {notice && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal">
            <CheckCircle2 size={16} /> {notice}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-3">Student</th><th>Risk</th><th>Probability</th><th>Attendance</th><th>Performance</th><th>Action</th></tr></thead>
            <tbody>
              {visible.map((student) => (
                <tr key={student.id} className="border-t border-line">
                  <td className="py-3 font-medium">{student.full_name}</td>
                  <td><RiskBadge risk={student.risk_level} /></td>
                  <td>{Math.round(student.probability * 100)}%</td>
                  <td>{student.attendance}%</td>
                  <td>{student.performance_score}%</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none"
                        value={selectedActions[student.id] || interventionActions[0]}
                        onChange={(event) => setSelectedActions((current) => ({ ...current, [student.id]: event.target.value }))}
                      >
                        {interventionActions.map((action) => <option key={action}>{action}</option>)}
                      </select>
                      <button onClick={() => createIntervention(student)} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-white disabled:opacity-60" disabled={interveningId === student.id || deletingId === student.id}>
                        <MessageSquare size={16} /> {interveningId === student.id ? "Sending..." : "Intervene"}
                      </button>
                      <button onClick={() => deleteStudent(student)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60" disabled={deletingId === student.id}>
                        <Trash2 size={16} /> {deletingId === student.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
