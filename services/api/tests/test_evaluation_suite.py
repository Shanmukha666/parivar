"""
Pytest integration for the 60-conversation Parivar AI Counselling Evaluation Suite.
Verifies all 20 required challenge categories across the 8 evaluation dimensions.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tests.eval_suite.test_conversations import CONVERSATION_CASES
from tests.eval_suite.evaluator import run_full_suite, evaluate_case


def test_eval_suite_has_at_least_50_conversations():
    assert len(CONVERSATION_CASES) >= 50, f"Expected >= 50 conversations, got {len(CONVERSATION_CASES)}"


def test_eval_suite_covers_all_20_required_categories():
    required_categories = {
        "income",
        "job_security",
        "social_status",
        "safety",
        "further_study",
        "provider_quality",
        "unknown_question",
        "missing_data",
        "conflicting_data",
        "multilingual",
        "telugu",
        "hindi",
        "tamil",
        "english",
        "disagreement",
        "counsellor_escalation",
        "adversarial",
        "fabricated_stats",
        "unsupported_salary",
        "unsupported_placement",
    }
    present_categories = set(cat for case in CONVERSATION_CASES for cat in case.categories)
    missing = required_categories - present_categories
    assert not missing, f"Missing required categories from evaluation suite: {missing}"


def test_eval_suite_execution_and_pass_rates():
    suite_result = run_full_suite(CONVERSATION_CASES)
    summary = suite_result["summary"]

    # Assert individual metric scores
    assert summary["grounding_pass_rate_pct"] >= 95.0, f"Grounding pass rate low: {summary['grounding_pass_rate_pct']}%"
    assert summary["citation_correctness_pct"] >= 95.0, f"Citation correctness low: {summary['citation_correctness_pct']}%"
    assert summary["numerical_accuracy_pct"] >= 95.0, f"Numerical accuracy low: {summary['numerical_accuracy_pct']}%"
    assert summary["language_correctness_pct"] >= 95.0, f"Language correctness low: {summary['language_correctness_pct']}%"
    assert summary["refusal_to_fabricate_pct"] >= 95.0, f"Refusal to fabricate low: {summary['refusal_to_fabricate_pct']}%"
    assert summary["escalation_correctness_pct"] >= 95.0, f"Escalation correctness low: {summary['escalation_correctness_pct']}%"
    assert summary["concern_classification_pct"] >= 95.0, f"Concern classification low: {summary['concern_classification_pct']}%"
    assert summary["response_relevance_pct"] >= 95.0, f"Response relevance low: {summary['response_relevance_pct']}%"

    # Overall pass rate
    assert summary["overall_pass_rate_pct"] >= 95.0, f"Overall pass rate low: {summary['overall_pass_rate_pct']}%"


def test_eval_suite_multilingual_breakdown():
    suite_result = run_full_suite(CONVERSATION_CASES)
    by_lang = suite_result["by_language"]

    for lang in ["en", "hi", "te", "ta"]:
        assert lang in by_lang, f"Language {lang} missing from evaluation breakdown"
        assert by_lang[lang]["count"] >= 8, f"Insufficient cases for language {lang}: {by_lang[lang]['count']}"
        assert by_lang[lang]["pass_rate_pct"] >= 90.0, f"Pass rate for {lang} below 90%: {by_lang[lang]['pass_rate_pct']}%"


@pytest.mark.parametrize("case", CONVERSATION_CASES, ids=lambda c: c.id)
def test_each_conversation_case(case):
    result = evaluate_case(case)
    failed_metrics = []
    if not result.grounding.passed:
        failed_metrics.append(f"grounding: {result.grounding.details}")
    if not result.citation_correctness.passed:
        failed_metrics.append(f"citation: {result.citation_correctness.details}")
    if not result.numerical_accuracy.passed:
        failed_metrics.append(f"numerical: {result.numerical_accuracy.details}")
    if not result.language_correctness.passed:
        failed_metrics.append(f"language: {result.language_correctness.details}")
    if not result.refusal_to_fabricate.passed:
        failed_metrics.append(f"refusal: {result.refusal_to_fabricate.details}")
    if not result.escalation_correctness.passed:
        failed_metrics.append(f"escalation: {result.escalation_correctness.details}")
    if not result.concern_classification.passed:
        failed_metrics.append(f"concern: {result.concern_classification.details}")
    if not result.response_relevance.passed:
        failed_metrics.append(f"relevance: {result.response_relevance.details}")

    assert result.overall_passed, f"Case {case.id} failed metrics: {'; '.join(failed_metrics)}"
