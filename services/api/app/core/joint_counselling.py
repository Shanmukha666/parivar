"""Private, two-party counselling flow for comparing learner and parent priorities."""

from copy import deepcopy

JOINT_QUESTIONS = ("preferred_trade", "top_priority", "preferred_location")
PARTICIPANTS = ("learner", "parent")


def _clean_answers(answers: dict) -> dict:
    return {
        key: str(answers[key]).strip()
        for key in JOINT_QUESTIONS
        if answers.get(key) is not None and str(answers[key]).strip()
    }


def record_answer(state: dict | None, participant: str, answers: dict) -> tuple[dict, dict]:
    if participant not in PARTICIPANTS:
        raise ValueError("participant must be learner or parent")
    cleaned = _clean_answers(answers)
    missing = [question for question in JOINT_QUESTIONS if question not in cleaned]
    next_state = deepcopy(state or {
        "mode": "joint",
        "answers": {},
        "status": "collecting",
        "comparison": None,
        "counselling_plan": None,
        "evidence_discussed": [],
        "unresolved": True,
        "escalation_status": "not_escalated",
    })
    merged_answers = {
        **next_state.setdefault("answers", {}).get(participant, {}),
        **cleaned,
    }
    next_state["answers"][participant] = merged_answers
    missing = [question for question in JOINT_QUESTIONS if question not in merged_answers]
    if missing:
        next_state["status"] = "incomplete"
        return next_state, {"status": "incomplete", "missing": missing, "revealed": False, "escalate": False}
    if participant == "learner":
        next_state["status"] = "awaiting_parent"
        return next_state, {"status": "awaiting_parent", "missing": [], "revealed": False, "escalate": False}
    if "learner" not in next_state["answers"] or len(next_state["answers"]["learner"]) < len(JOINT_QUESTIONS):
        next_state["status"] = "awaiting_learner"
        return next_state, {"status": "awaiting_learner", "missing": JOINT_QUESTIONS, "revealed": False, "escalate": False}
    comparison = compare_answers(next_state["answers"]["learner"], cleaned)
    next_state["comparison"] = comparison
    next_state["counselling_plan"] = counselling_plan(comparison)
    next_state["status"] = "compared"
    return next_state, {
        "status": "compared",
        "missing": [],
        "revealed": True,
        "comparison": comparison,
        "counselling_plan": next_state["counselling_plan"],
        "escalate": False,
    }


def compare_answers(learner: dict, parent: dict) -> dict:
    agreements = [key for key in JOINT_QUESTIONS if learner.get(key, "").casefold() == parent.get(key, "").casefold()]
    disagreements = [key for key in JOINT_QUESTIONS if key not in agreements]
    return {
        "agreements": agreements,
        "disagreements": disagreements,
        "has_disagreement": bool(disagreements),
        "neutral_language": True,
    }


def counselling_plan(comparison: dict) -> dict:
    disagreements = comparison["disagreements"]
    return {
        "goal": "Support an informed family discussion; the system does not decide for the family.",
        "steps": [
            f"Discuss the evidence for {area.replace('_', ' ')} together."
            for area in disagreements
        ] or ["Confirm the shared priorities and next steps together."],
        "decision_owner": "family",
        "avoid_blame": True,
    }


def mark_evidence_discussed(state: dict, citations: list[dict], unresolved: bool = True) -> dict:
    next_state = deepcopy(state)
    next_state["evidence_discussed"] = list(next_state.get("evidence_discussed", [])) + citations
    next_state["unresolved"] = unresolved
    return next_state


def request_escalation(state: dict) -> dict:
    next_state = deepcopy(state)
    next_state["escalation_status"] = "pending"
    next_state["unresolved"] = True
    return next_state
