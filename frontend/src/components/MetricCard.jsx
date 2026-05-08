import { motion } from "framer-motion";

export default function MetricCard({ title, value, detail, icon: Icon, tone = "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    yellow: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-700"
  };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
        </div>
        {Icon && <div className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone]}`}><Icon size={20} /></div>}
      </div>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </motion.div>
  );
}
