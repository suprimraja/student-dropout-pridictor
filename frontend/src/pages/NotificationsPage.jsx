import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { api } from "../services/api";
import Card from "../components/Card";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notifications").then(({ data }) => setItems(data)); }, []);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold">Notifications</h3>
      <div className="grid gap-3">
        {items.length === 0 && <p className="text-slate-500">No alerts yet. New warnings appear when risk increases, attendance drops, or performance declines.</p>}
        {items.map((item) => (
          <div key={item.id} className={`flex gap-3 rounded-lg border p-4 ${item.severity === "critical" ? "border-red-200 bg-red-50" : "border-line bg-slate-50"}`}>
            <BellRing className={item.severity === "critical" ? "text-red-600" : "text-teal"} />
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
