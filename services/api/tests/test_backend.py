import pytest
import os
import sys

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.validator import validate_numbers
from app.core.classifier import _keyword_classify
from app.main import app

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

def test_fastapi_routes():
    route_paths = [r.path for r in app.routes]
    assert "/health" in route_paths
    assert "/sessions" in route_paths
    assert "/chat" in route_paths
    assert "/trades" in route_paths
    assert "/counsellor/queue" in route_paths
    assert "/admin/metrics" in route_paths
    assert "/admin/resistance-index" in route_paths
    assert "/summary-card" in route_paths
