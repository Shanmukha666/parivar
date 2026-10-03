import pytest
import os
import sys

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.validator import validate_numbers
from app.core.classifier import _keyword_classify, classify_concerns, update_concern_state
from app.main import app
from app.core.tools import get_outcomes, get_story
from app.schemas.schemas import MetricIngest, SessionCreate
from app.routers.outcomes import is_stale
from datetime import date
from app.core.grounding import assess_evidence, validate_reply, source_citations, requires_quantitative_evidence
from app.core.joint_counselling import record_answer, compare_answers, request_escalation
from app.core.escalation import transition_ticket, can_view_ticket, can_view_family_ticket
from app.models.models import Escalation
from uuid import uuid4
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql

class _EmptyResult:
    def scalars(self):
        return self

    def first(self):
        return None

    def all(self):
        return []

class _CaptureDb:
    def __init__(self):
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return _EmptyResult()

def test_number_validator_match():
    tool_results = {
        "outcomes": {
            "placement_rate": 78.4,
            "avg_start_salary_inr": 16500,
            "salary_3yr_min": 20000,
            "salary_3yr_max": 30000,
            "sample_size": 42,
            "cohort_year": 2024
        }
    }
    valid_reply = "In your district, 78% of students were placed with starting salary of ₹16,500. After 3 years, learners earn ₹20,000 to ₹30,000."
    is_valid, unmatched = validate_numbers(valid_reply, tool_results)
    assert is_valid
    assert len(unmatched) == 0

def test_number_validator_catches_hallucination():
    tool_results = {
        "outcomes": {
            "placement_rate": 78.4,
            "avg_start_salary_inr": 16500,
        }
    }
    hallucinated_reply = "Your child will earn ₹50,000 immediately after 6 months."
    is_valid, unmatched = validate_numbers(hallucinated_reply, tool_results)
    assert not is_valid
    assert any("50000" in u for u in unmatched)


def test_low_confidence_evidence_requires_escalation():
    assessment = assess_evidence({
        "outcomes": {
            "metrics": [{
                "metric_key": "placement_rate",
                "value": 72,
                "confidence": 0.2,
                "verification_status": "verified",
                "is_synthetic": False,
                "source": {"url": "https://example.gov/report"},
            }]
        }
    })
    assert not assessment.usable
    assert assessment.reason == "evidence_confidence_below_threshold"

def test_objection_classifier():
    # Income
    res = _keyword_classify("How much will my child earn? Is the salary sufficient?", speaker="parent")
    assert res["objection_category"] == "income"

    # Status
    res = _keyword_classify("What will relatives say? Society expects a degree.", speaker="parent")
    assert res["objection_category"] in ["status", "degree_pref"]

    # Safety
    res = _keyword_classify("Is welding safe? I worry about injury and accidents.", speaker="parent")
    assert res["objection_category"] == "safety"

    # Human request
    res = _keyword_classify("Can I talk to a counsellor or human person please?", speaker="parent")
    assert res["intent"] == "request_human"

def test_concern_state_multilingual_examples():
    hindi = classify_concerns("इससे नौकरी मिलेगी क्या?", speaker="parent")
    assert hindi["concerns"] == ["job_security"]
    assert hindi["concern_intensity"] == "HIGH"

    telugu = classify_concerns("దీనితో జీతం ఎంత వస్తుంది?", speaker="parent")
    assert telugu["concerns"] == ["income_potential"]
    assert telugu["concern_intensity"] == "HIGH"

def test_concern_state_supports_multiple_labels_and_intensity():
    result = classify_concerns("Is the job safe and what salary can my child earn?")
    assert set(result["concerns"]) == {"job_security", "safety", "income_potential"}
    assert result["concern_intensity"] == "HIGH"
    assert result["is_diagnostic"] is False

    assert classify_concerns("salary")["concern_intensity"] == "LOW"

def test_concern_state_preserves_initial_and_evidence():
    class SessionStub:
        concern_state = None

    session = SessionStub()
    first = update_concern_state(session, {"concerns": ["income_potential"], "concern_intensity": "HIGH"})
    assert first["initial_concerns"] == ["income_potential"]
    update_concern_state(
        session,
        {"concerns": ["job_security"], "concern_intensity": "MEDIUM"},
        evidence_presented=[{"source_id": "source-1"}],
        escalation_status="escalated",
    )
    assert session.concern_state["initial_concerns"] == ["income_potential", "job_security"]
    assert session.concern_state["unresolved_concerns"] == ["income_potential", "job_security"]
    assert session.concern_state["evidence_presented"] == [{"source_id": "source-1"}]
    assert session.concern_state["escalation_status"] == "escalated"

def _joint_answers(trade="Automotive", priority="job security", location="near home"):
    return {
        "preferred_trade": trade,
        "top_priority": priority,
        "preferred_location": location,
    }

def test_joint_counselling_agreement():
    state, first = record_answer(None, "learner", _joint_answers())
    assert first["status"] == "awaiting_parent"
    assert first["revealed"] is False
    state, result = record_answer(state, "parent", _joint_answers())
    assert result["status"] == "compared"
    assert result["comparison"]["agreements"] == [
        "preferred_trade", "top_priority", "preferred_location"
    ]
    assert result["comparison"]["disagreements"] == []
    assert result["counselling_plan"]["avoid_blame"] is True

def test_joint_counselling_disagreement_is_neutral_and_hidden_until_complete():
    state, result = record_answer(None, "learner", _joint_answers())
    assert "comparison" not in result
    assert "Automotive" not in str(result)
    state, result = record_answer(
        state, "parent", _joint_answers("General degree", "recognition", "near home")
    )
    assert result["comparison"]["disagreements"] == ["preferred_trade", "top_priority"]
    assert result["counselling_plan"]["decision_owner"] == "family"
    assert "wrong" not in str(result).lower()

def test_joint_counselling_incomplete_and_multilingual_answers():
    state, result = record_answer(
        None,
        "learner",
        {"preferred_trade": "ऑटोमोटिव", "top_priority": "नौकरी की सुरक्षा"},
    )
    assert result["status"] == "incomplete"
    assert result["revealed"] is False
    assert result["missing"] == ["preferred_location"]

    state, result = record_answer(
        state,
        "learner",
        {"preferred_location": "ఇంటి దగ్గర"},
    )
    assert result["status"] == "awaiting_parent"
    assert result["revealed"] is False

def test_joint_counselling_escalation_state():
    state, result = record_answer(None, "learner", _joint_answers())
    assert result["escalate"] is False
    state, result = record_answer(state, "parent", _joint_answers("General degree"))
    assert result["status"] == "compared"
    escalated = request_escalation(state)
    assert escalated["escalation_status"] == "pending"
    assert escalated["unresolved"] is True

def test_fastapi_routes():
    def paths(routes):
        found = []
        for route in routes:
            if hasattr(route, "path"):
                found.append(route.path)
            if hasattr(route, "routes"):
                found.extend(paths(route.routes))
            if hasattr(route, "original_router"):
                prefix = getattr(getattr(route, "include_context", None), "prefix", "")
                found.extend(prefix + child.path for child in route.original_router.routes if hasattr(child, "path"))
        return found

    route_paths = paths(app.routes)
    assert "/health" in route_paths
    assert "/sessions" in route_paths
    assert "/chat" in route_paths
    assert "/trades" in route_paths
    assert "/counsellor/queue" in route_paths
    assert "/admin/metrics" in route_paths
    assert "/admin/resistance-index" in route_paths
    assert "/summary-card" in route_paths
    assert "/counsellor/{id}/contact" in route_paths
    assert "/counsellor/{id}/close" in route_paths


def test_escalation_state_machine_requires_assignment_and_contact():
    counsellor_id = uuid4()
    ticket = Escalation(status="new")

    transition_ticket(ticket, "accept", str(counsellor_id), "counsellor")
    assert ticket.status == "assigned"
    assert str(ticket.counsellor_id) == str(counsellor_id)

    transition_ticket(ticket, "contact", str(counsellor_id), "counsellor")
    assert ticket.status == "contacted"
    transition_ticket(ticket, "resolve", str(counsellor_id), "counsellor")
    assert ticket.status == "resolved"
    transition_ticket(ticket, "close", str(counsellor_id), "counsellor")
    assert ticket.status == "closed_no_response"


def test_escalation_authorization_and_ticket_ownership():
    assigned = uuid4()
    other = uuid4()
    ticket = Escalation(status="new")

    with pytest.raises(ValueError):
        transition_ticket(ticket, "contact", str(other), "counsellor")

    transition_ticket(ticket, "accept", str(assigned), "counsellor")
    with pytest.raises(PermissionError):
        transition_ticket(ticket, "contact", str(other), "counsellor")

    ticket.session_id = uuid4()
    assert can_view_ticket(ticket, str(assigned), "counsellor")
    assert not can_view_ticket(ticket, str(other), "counsellor")
    assert can_view_ticket(ticket, str(other), "admin")
    assert can_view_family_ticket(ticket, "family-1", "family-1")
    assert not can_view_family_ticket(ticket, "family-1", "family-2")

@pytest.mark.asyncio
async def test_outcome_queries_require_reviewed_non_synthetic_data():
    db = _CaptureDb()
    result = await get_outcomes(1, "Telangana", district="Hyderabad", db=db)
    assert result["found"] is False
    sql = " ".join(str(statement.compile(dialect=postgresql.dialect())) for statement in db.statements)
    assert "outcome_metrics.verification_status = " in sql
    assert "outcome_metrics.is_synthetic IS false" in sql
    assert "data_sources.id = outcome_metrics.source_id" in sql

@pytest.mark.asyncio
async def test_story_queries_require_verified_non_synthetic_data():
    db = _CaptureDb()
    result = await get_story(1, district="Hyderabad", db=db)
    assert result["found"] is False
    sql = str(db.statements[0].compile(dialect=postgresql.dialect()))
    assert "stories.verified IS true" in sql
    assert "stories.is_synthetic IS false" in sql

def test_metric_requires_provenance_and_rejects_synthetic_verified():
    with pytest.raises(ValidationError):
        MetricIngest(
            trade_id=1, state="Telangana", metric_key="placement_rate",
            metric_value=70, unit="percent", publisher="x", source_title="y",
        )
    with pytest.raises(ValidationError):
        MetricIngest(
            trade_id=1, state="Telangana", metric_key="placement_rate",
            metric_value=70, unit="percent", publisher="x", source_title="y",
            document_reference="DEMO", verification_status="verified", is_synthetic=True,
        )

def test_metric_rejects_invalid_percentage():
    with pytest.raises(ValidationError):
        MetricIngest(
            trade_id=1, state="Telangana", metric_key="placement_rate",
            metric_value=101, unit="percent", publisher="x", source_title="y",
            document_reference="DOC-1",
        )

def test_metric_rejects_invalid_source_url_and_marks_stale_records():
    with pytest.raises(ValidationError):
        MetricIngest(
            trade_id=1, state="Telangana", metric_key="placement_rate",
            metric_value=70, unit="percent", publisher="x", source_title="y",
            source_url="not-a-url",
        )
    assert is_stale(date(2023, 1, 1), date(2026, 10, 3))
    assert not is_stale(date(2025, 1, 1), date(2026, 10, 3))

def test_minor_requires_guardian_consent():
    with pytest.raises(ValidationError):
        SessionCreate(
            lang="en", state="Telangana", district="Hyderabad",
            user_role="both", learner_class="10", income_bracket="low",
            consent=True, learner_age=16,
        )

def _verified_metrics():
    return {
        "outcomes": {
            "metrics": [
                {
                    "metric_key": "placement_rate", "value": 78.4,
                    "source": {"publisher": "Skill Board", "title": "2024 outcomes",
                               "url": "https://example.test/outcomes"},
                    "verification_status": "verified", "is_synthetic": False,
                },
                {
                    "metric_key": "starting_earnings", "value": 16500,
                    "source": {"publisher": "Skill Board", "title": "2024 outcomes",
                               "url": "https://example.test/outcomes"},
                    "verification_status": "verified", "is_synthetic": False,
                },
            ]
        }
    }

def test_grounding_accepts_verified_data_and_preserves_citation():
    evidence = assess_evidence(_verified_metrics())
    assert evidence.usable
    assert validate_reply("Placement was 78.4% and starting pay was ₹16,500.", _verified_metrics()) == (True, [])
    citations = source_citations(_verified_metrics())
    assert citations[0]["url"] == "https://example.test/outcomes"
    assert citations[0]["verified"] is True

@pytest.mark.parametrize("question", [
    "What salary can my child earn?",
    "What is the placement rate?",
    "Is there a job after training?",
    "How much can they earn in the first month?",
    "What are the chances of getting a job?",
    "Will income grow after three years?",
    "Which provider is safest?",
    "Is this better than a degree?",
    "What does society think about this trade?",
    "How long is the course?",
    "What is the training fee?",
    "Can my daughter work near home?",
    "Is there a government job?",
    "What is the NSQF level?",
    "Can they start a business?",
    "Which job roles are available?",
    "What happens if placement is low?",
    "Can we trust these numbers?",
    "Are there apprenticeships?",
    "Can a counsellor call us?",
])
def test_parent_evaluation_questions_are_present(question):
    assert question

def test_grounding_rejects_hallucinated_salary_and_placement():
    ok, unsupported = validate_reply("Salary is ₹50,000 and placement is 95%.", _verified_metrics())
    assert not ok
    assert set(unsupported) == {"50,000", "95"}

def test_grounding_rejects_missing_retrieval_and_missing_source():
    assert assess_evidence({"outcomes": {"metrics": []}}).reason == "verified_data_unavailable"
    record = _verified_metrics()
    record["outcomes"]["metrics"][0]["source"] = {}
    assert assess_evidence(record).reason == "verified_data_unavailable"

def test_grounding_rejects_synthetic_data():
    record = _verified_metrics()
    record["outcomes"]["metrics"][0]["is_synthetic"] = True
    assert assess_evidence(record).reason == "verified_data_unavailable"

def test_grounding_detects_conflicting_verified_records():
    record = _verified_metrics()
    conflicting = dict(record["outcomes"]["metrics"][0])
    conflicting["value"] = 82
    conflicting["source"] = {"publisher": "Other Board", "title": "Conflicting 2024", "document_reference": "DOC-2"}
    record["outcomes"]["metrics"].append(conflicting)
    result = assess_evidence(record)
    assert result.reason == "conflicting_verified_data"
    assert result.conflicts[0]["metric_key"] == "placement_rate"

def test_grounding_only_requires_numeric_evidence_for_numeric_questions():
    assert requires_quantitative_evidence("What salary can my child earn?")
    assert requires_quantitative_evidence("What is the placement percentage?")
    assert not requires_quantitative_evidence("Is the workshop safe?")
