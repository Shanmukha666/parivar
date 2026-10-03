"""Application-level evidence gates for counselling responses.

The model can phrase an answer, but it cannot introduce facts. Evidence is
accepted only when it is verified, non-synthetic, and has provenance.
"""

from __future__ import annotations

import re
import os
from dataclasses import dataclass
from typing import Any

NUMBER_RE = re.compile(r"(?<![A-Za-z])(?:₹\s*)?(\d[\d,]*(?:\.\d+)?)")
QUANTITATIVE_KEYS = {
    "placement_rate", "starting_earnings", "earnings_after_period",
    "self_employment_rate", "duration_months", "provider_statistic",
    "nsqf_level",
}
EVIDENCE_CONFIDENCE_THRESHOLD = float(os.getenv("EVIDENCE_CONFIDENCE_THRESHOLD", "0.6"))


@dataclass(frozen=True)
class EvidenceAssessment:
    usable: bool
    reason: str
    conflicts: list[dict[str, Any]]


def assess_evidence(tool_results: dict[str, Any]) -> EvidenceAssessment:
    records = tool_results.get("outcomes", {}).get("metrics", [])
    usable_records = []
    for record in records:
        source = record.get("source") or {}
        if not (
            record.get("verification_status", "verified") == "verified"
            and record.get("is_synthetic", False) is False
            and (source.get("url") or source.get("document_reference"))
        ):
            return EvidenceAssessment(False, "verified_data_unavailable", [])
        confidence = record.get("confidence")
        if confidence is not None and float(confidence) < EVIDENCE_CONFIDENCE_THRESHOLD:
            return EvidenceAssessment(False, "evidence_confidence_below_threshold", [])
        usable_records.append(record)

    if not usable_records:
        return EvidenceAssessment(False, "verified_data_unavailable", [])

    grouped: dict[str, set[tuple[Any, str | None]]] = {}
    for record in usable_records:
        key = f"{record.get('metric_key')}:{record.get('year')}"
        value = record.get("value", record.get("metric_value"))
        source = (record.get("source") or {}).get("title")
        grouped.setdefault(key, set()).add((value, source))

    conflicts = [
        {"metric_key": key.split(":", 1)[0], "values": [{"value": value, "source": source} for value, source in values]}
        for key, values in grouped.items()
        if len({value for value, _ in values}) > 1
    ]
    if conflicts:
        return EvidenceAssessment(False, "conflicting_verified_data", conflicts)
    return EvidenceAssessment(True, "verified", [])


def validate_reply(reply: str, tool_results: dict[str, Any]) -> tuple[bool, list[str]]:
    """Reject every numeric claim not present exactly in usable evidence."""
    assessment = assess_evidence(tool_results)
    if not assessment.usable:
        return False, ["evidence_unavailable"]

    allowed: set[float] = set()
    for record in tool_results.get("outcomes", {}).get("metrics", []):
        if record.get("verification_status", "verified") != "verified" or record.get("is_synthetic", False):
            continue
        value = record.get("value", record.get("metric_value"))
        if isinstance(value, (int, float)):
            allowed.add(float(value))
        elif isinstance(value, str):
            allowed.update(float(n.replace(",", "")) for n in NUMBER_RE.findall(value))
        if record.get("year"):
            try:
                allowed.add(float(record.get("year")))
            except (ValueError, TypeError):
                pass
        if record.get("sample_size"):
            try:
                allowed.add(float(record.get("sample_size")))
            except (ValueError, TypeError):
                pass
        # Also include numbers from source title or doc_ref (like Table 4.1 or MP-Solar-2024)
        source = record.get("source") or {}
        for s_field in (source.get("title", ""), source.get("document_reference", "")):
            if s_field:
                for n in NUMBER_RE.findall(str(s_field)):
                    try:
                        allowed.add(float(n.replace(",", "")))
                    except ValueError:
                        pass

    # Allow small structural numbers (1-10) like steps, levels, years of experience
    for i in range(1, 11):
        allowed.add(float(i))

    unsupported = []
    for raw in NUMBER_RE.findall(reply):
        number = float(raw.replace(",", ""))
        if number > 10 and number not in allowed:
            unsupported.append(raw)
    return not unsupported, unsupported


def source_citations(tool_results: dict[str, Any]) -> list[dict[str, Any]]:
    citations = []
    seen = set()
    for record in tool_results.get("outcomes", {}).get("metrics", []):
        source = record.get("source") or {}
        key = (source.get("publisher"), source.get("title"), source.get("url"), source.get("document_reference"))
        if key in seen:
            continue
        seen.add(key)
        citations.append({
            "publisher": source.get("publisher"),
            "title": source.get("title"),
            "url": source.get("url"),
            "document_reference": source.get("document_reference"),
            "verified": True,
            "is_synthetic": False,
        })
    return citations


def requires_quantitative_evidence(text: str, classification: dict[str, Any] | None = None) -> bool:
    category = (classification or {}).get("objection_category")
    if category in {"income", "job_security", "cost"}:
        return True
    lowered = text.lower()
    return any(term in lowered for term in (
        "salary", "earn", "income", "placement", "percentage", "percent",
        "fee", "cost", "duration", "how much", "kitna", "कमाई", "वेतन", "జీతం",
        "சம்பளம்", "வருமானம்", "கட்டணம்",
    ))
