export const courseGroups = [
  {
    label: "School / Entrance",
    options: [
      { value: "Science PCM", label: "Science PCM", subjects: ["Physics", "Chemistry", "Math"] },
      { value: "Science PCB", label: "Science PCB", subjects: ["Physics", "Chemistry", "Biology"] },
      { value: "Commerce", label: "Commerce", subjects: ["Accountancy", "Economics", "Business Studies"] },
      { value: "Humanities", label: "Humanities", subjects: ["History", "Political Science", "Sociology"] }
    ]
  },
  {
    label: "College Courses",
    options: [
      { value: "B.Tech CSE", label: "B.Tech CSE", subjects: ["Programming", "Data Structures", "Mathematics"] },
      { value: "B.Tech ECE", label: "B.Tech ECE", subjects: ["Circuits", "Signals", "Mathematics"] },
      { value: "BCA", label: "BCA", subjects: ["Programming", "Database Systems", "Mathematics"] },
      { value: "BBA", label: "BBA", subjects: ["Management", "Accounting", "Economics"] },
      { value: "B.Com", label: "B.Com", subjects: ["Accounting", "Taxation", "Economics"] },
      { value: "BA", label: "BA", subjects: ["Major Subject", "Writing", "General Studies"] },
      { value: "MBA", label: "MBA", subjects: ["Quantitative Aptitude", "Business Analytics", "Communication"] }
    ]
  }
];

export const courseOptions = courseGroups.flatMap((group) => group.options);

export function getCourseSubjects(course) {
  return courseOptions.find((option) => option.value === course)?.subjects || ["Subject 1", "Subject 2", "Subject 3"];
}

export function subjectLabelForFeature(feature, course) {
  const [first, second, third] = getCourseSubjects(course);
  const featureMap = {
    "Physics score": `${first} score`,
    "Chemistry score": `${second} score`,
    "Math score": `${third} score`
  };
  return featureMap[feature] || feature;
}
