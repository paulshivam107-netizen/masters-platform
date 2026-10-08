"""Programme-aware practice plans; the applicant's answers determine the branches."""

PLAN_VERSION = "resume-led-v1"
FOCUS_TOPICS = {
    "resume": ["education", "experience", "projects", "interests"],
    "behavioural": ["behaviour"],
    "motivation": ["motivation", "contribution"],
    "academics": ["education", "projects"],
    "work": ["experience", "projects", "behaviour"],
}


def make_plan(route, focus):
    return {
        "version": PLAN_VERSION, "focus": focus,
        "priority_topics": FOCUS_TOPICS.get(focus) or (
            ["education", "projects", "behaviour", "motivation", "contribution"] if route == "cat" else
            ["experience", "projects", "behaviour", "motivation", "contribution"]),
        "max_follow_ups": 2 if focus == "balanced" else 4,
        "criteria": (
            ["understanding of studies/projects", "personal contribution", "reasoning and curiosity", "reflection", "MBA motivation"]
            if route == "cat" else
            ["personal ownership and scope", "judgment and trade-offs", "substantiated outcomes", "learning from setbacks", "career rationale", "contribution to peers"]),
    }


def next_step(context, transcript):
    plan = context.get("interview_plan") or make_plan(context["route"], context.get("practice_focus", "balanced"))
    depth = 0
    for turn in reversed(transcript):
        if turn["role"] != "assistant":
            continue
        if turn.get("kind") not in ("follow_up", "clarification"):
            break
        depth += 1
    covered = list(dict.fromkeys(t["topic"] for t in transcript if t.get("topic")))
    return {**plan, "branch_depth": depth, "covered_topics": covered,
            "move_on": depth >= plan["max_follow_ups"],
            "answers_remaining": max(0, context.get("question_limit", 5) - sum(t["role"] == "user" for t in transcript))}
