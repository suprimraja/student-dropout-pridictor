export default function RiskBadge({ risk }) {
  const cls = risk === "High" ? "risk-high" : risk === "Medium" ? "risk-medium" : "risk-low";
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>{risk}</span>;
}
