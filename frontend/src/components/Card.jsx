export default function Card({ children, className = "" }) {
  return <section className={`rounded-lg border border-line bg-panel p-5 shadow-soft ${className}`}>{children}</section>;
}
