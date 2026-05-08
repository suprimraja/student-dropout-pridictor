def build_suggestions(features: dict, top_features: list[dict]) -> list[str]:
    suggestions: list[str] = []
    weak_subjects = [
        ("Physics", features["physics_score"]),
        ("Chemistry", features["chemistry_score"]),
        ("Math", features["math_score"]),
    ]
    weakest_subject, weakest_score = min(weak_subjects, key=lambda item: item[1])

    if features["study_hours"] < 4:
        suggestions.append("Increase focused study to at least 4-5 hours with two 45-minute problem-solving blocks.")
    if features["attendance"] < 75:
        suggestions.append("Prioritize attendance recovery; low attendance is a strong early-warning signal.")
    if weakest_score < 65:
        suggestions.append(f"Schedule targeted revision for {weakest_subject}; start with error logs from the last two tests.")
    if not features["fee_status"]:
        suggestions.append("Resolve fee-status issues early so administrative friction does not disrupt classes or tests.")

    for item in top_features[:2]:
        if item["direction"] == "increases_risk":
            suggestions.append(item["advice"])

    if not suggestions:
        suggestions.append("Maintain the current rhythm and add one timed mixed-subject mock test this week.")
    return list(dict.fromkeys(suggestions))[:5]
