import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, Bot, Gauge, GraduationCap, LineChart, ListChecks, LogOut, SlidersHorizontal, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/student", label: "Student", icon: Gauge, roles: ["student"] },
  { to: "/faculty", label: "Faculty", icon: Users, roles: ["faculty"] },
  { to: "/bulk-analyzer", label: "Bulk Analyzer", icon: ListChecks, roles: ["faculty"] },
  { to: "/predict", label: "Predict", icon: LineChart, roles: ["student", "faculty"] },
  { to: "/simulator", label: "Predict Simulator", icon: SlidersHorizontal, roles: ["student", "faculty"] },
  { to: "/chatbot", label: "Mentor", icon: Bot, roles: ["student", "faculty"] },
  { to: "/notifications", label: "Alerts", icon: Bell, roles: ["student", "faculty"] }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#f5f7fb] lg:flex">
      <aside className="glass sticky top-0 z-20 border-b border-line px-4 py-3 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white"><GraduationCap size={22} /></div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal">Student Dropout</p>
            <h1 className="text-lg font-bold">Pridictor</h1>
          </div>
        </div>
        <nav className="mt-5 flex gap-2 overflow-auto lg:flex-col">
          {links.filter((link) => link.roles.includes(user?.role)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex min-w-fit items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-ink text-white shadow-soft" : "text-slate-600 hover:bg-white"}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="mt-5 hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-white lg:flex"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>
      <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Signed in as {user?.role}</p>
            <h2 className="text-2xl font-bold text-ink">{user?.full_name}</h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 ring-1 ring-line">{new Date().toLocaleDateString()}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
