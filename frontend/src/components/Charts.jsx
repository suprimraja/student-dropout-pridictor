import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "./Card";
import { getCourseSubjects } from "../utils/courses";

export function PerformanceLine({ data }) {
  return (
    <Card>
      <h3 className="mb-4 font-semibold">Performance Trend</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf0" />
          <XAxis dataKey="week" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="performance" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="risk" stroke="#e85d4f" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function SubjectBars({ scores }) {
  const [first, second, third] = getCourseSubjects(scores.course);
  const data = [
    { subject: first, score: scores.physics_score },
    { subject: second, score: scores.chemistry_score },
    { subject: third, score: scores.math_score }
  ];
  return (
    <Card>
      <h3 className="mb-4 font-semibold">Subject Scores</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf0" />
          <XAxis dataKey="subject" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {data.map((entry) => <Cell key={entry.subject} fill={entry.score < 65 ? "#e85d4f" : "#0f766e"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function StudyPie({ hours }) {
  const data = [
    { name: "Concepts", value: Math.max(1, hours * 0.35) },
    { name: "Practice", value: Math.max(1, hours * 0.45) },
    { name: "Revision", value: Math.max(1, hours * 0.2) }
  ];
  const colors = ["#0f766e", "#3b82f6", "#d89b00"];
  return (
    <Card>
      <h3 className="mb-4 font-semibold">Study Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
            {data.map((entry, index) => <Cell key={entry.name} fill={colors[index]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
