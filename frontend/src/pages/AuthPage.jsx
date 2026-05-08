import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", role: "student", full_name: "" });
  const [error, setError] = useState("");
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = mode === "login" ? await login(form.email, form.password) : await signup(form);
      navigate(data.role === "faculty" ? "/faculty" : "/student");
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#edf3f8]">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative flex items-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="absolute inset-0 bg-[url('/assets/fig1_roc_curves.png')] bg-cover bg-center opacity-10" />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-teal">Explainable academic intelligence</p>
            <h1 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">Student Dropout Pridictor</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">Risk prediction, SHAP explanations, faculty intervention, and conversational JEE guidance in one focused dashboard.</p>
          </div>
        </section>
        <section className="flex items-center justify-center px-6 py-10">
          <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
            <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
              {["login", "signup"].map((item) => (
                <button key={item} type="button" onClick={() => setMode(item)} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold capitalize ${mode === item ? "bg-white text-ink shadow" : "text-slate-500"}`}>{item}</button>
              ))}
            </div>
            {mode === "signup" && (
              <label className="mb-4 grid gap-1 text-sm font-medium text-slate-600">Full name
                <div className="flex items-center gap-2 rounded-lg border border-line px-3"><UserRound size={18} /><input className="w-full py-2 outline-none" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              </label>
            )}
            <label className="mb-4 grid gap-1 text-sm font-medium text-slate-600">Email
              <div className="flex items-center gap-2 rounded-lg border border-line px-3"><Mail size={18} /><input className="w-full py-2 outline-none" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </label>
            <label className="mb-4 grid gap-1 text-sm font-medium text-slate-600">Password
              <div className="flex items-center gap-2 rounded-lg border border-line px-3"><Lock size={18} /><input type="password" className="w-full py-2 outline-none" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </label>
            {mode === "signup" && (
              <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
                {["student", "faculty"].map((role) => (
                  <button key={role} type="button" onClick={() => setForm({ ...form, role })} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold capitalize ${form.role === role ? "bg-white text-ink shadow" : "text-slate-500"}`}>{role}</button>
                ))}
              </div>
            )}
            {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="w-full rounded-lg bg-ink px-4 py-3 font-semibold text-white">{mode === "login" ? "Login" : "Create account"}</button>
          </motion.form>
        </section>
      </div>
    </main>
  );
}
