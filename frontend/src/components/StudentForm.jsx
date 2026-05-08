import { courseGroups, getCourseSubjects } from "../utils/courses";

const baseFields = [
  ["study_hours", "Study hours", 0, 16],
  ["attendance", "Attendance", 0, 100]
];

const subjectScoreKeys = ["physics_score", "chemistry_score", "math_score"];

export default function StudentForm({ form, setForm, sliders = false }) {
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const numberValue = (value) => value === "" || value === null || value === undefined ? "" : value;
  const subjectFields = getCourseSubjects(form.course).map((label, index) => [subjectScoreKeys[index], label, 0, 100]);
  const fields = [...baseFields, ...subjectFields];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-600">Name
          <input className="rounded-lg border border-line px-3 py-2" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-600">Course
          <select className="rounded-lg border border-line px-3 py-2" value={form.course} onChange={(e) => update("course", e.target.value)}>
            <option value="">Select course</option>
            {courseGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((course) => <option key={course.value} value={course.value}>{course.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      {fields.map(([key, label, min, max]) => (
        <label key={key} className="grid gap-2 text-sm font-medium text-slate-600">
          <span className="flex justify-between"><span>{label}</span><b>{numberValue(form[key]) || "-"}</b></span>
          {sliders ? (
            <input type="range" min={min} max={max} step="1" value={numberValue(form[key]) || min} onChange={(e) => update(key, Number(e.target.value))} />
          ) : (
            <input
              type="number"
              min={min}
              max={max}
              className="rounded-lg border border-line px-3 py-2"
              value={numberValue(form[key])}
              onChange={(e) => update(key, e.target.value === "" ? "" : Number(e.target.value))}
            />
          )}
        </label>
      ))}
      <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
        <input type="checkbox" checked={form.fee_status} onChange={(e) => update("fee_status", e.target.checked)} />
        Tuition fees up to date
      </label>
    </div>
  );
}
