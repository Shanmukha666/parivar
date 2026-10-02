"""
Number validator – ensures every number in the LLM reply comes from tool results.
PRD section 6.8.
"""

import re
from typing import Tuple, List, Set


def _extract_numbers(text: str) -> Set[float]:
    """Extract all numeric values from text, including comma-separated and decimal numbers."""
    # Match numbers like 18000, 18,000, 78.5, ₹15,000 etc.
    raw = re.findall(r'[\d,]+\.?\d*', text)
    nums: Set[float] = set()
    for r in raw:
        cleaned = r.replace(',', '')
        if cleaned and cleaned != '.':
            try:
                nums.add(float(cleaned))
            except ValueError:
                continue
    return nums


def _build_allowed_set(tool_results: dict) -> Set[float]:
    """
    Traverse all tool results and collect every numeric value.
    Also adds common rounded variants (nearest 1000 for salaries, nearest 1 for percentages).
    """
    allowed: Set[float] = set()

    def _collect(obj):
        if isinstance(obj, (int, float)):
            val = float(obj)
            allowed.add(val)
            # Allow rounding to nearest whole percent
            allowed.add(round(val))
            # Allow rounding to nearest thousand (for salaries)
            if val >= 1000:
                allowed.add(round(val / 1000) * 1000)
            # Allow "X out of 100" phrasing for percentages
            if 0 <= val <= 100:
                allowed.add(round(val))
        elif isinstance(obj, str):
            # Extract numbers embedded in strings like "₹15,000-₹25,000"
            for n in _extract_numbers(obj):
                allowed.add(n)
                allowed.add(round(n))
                if n >= 1000:
                    allowed.add(round(n / 1000) * 1000)
        elif isinstance(obj, dict):
            for v in obj.values():
                _collect(v)
        elif isinstance(obj, (list, tuple)):
            for item in obj:
                _collect(item)

    _collect(tool_results)

    # Always allow these common "structural" numbers
    # (step numbers, years, NSQF levels 1-10, small ordinals)
    for i in range(1, 11):
        allowed.add(float(i))

    return allowed


def validate_numbers(llm_reply: str, tool_results: dict) -> Tuple[bool, List[str]]:
    """
    Check that every number in the LLM reply exists in tool_results.

    Returns:
        (is_valid, list_of_unmatched_number_strings)
    """
    reply_numbers = _extract_numbers(llm_reply)
    allowed = _build_allowed_set(tool_results)

    unmatched: List[str] = []
    for num in reply_numbers:
        # Skip very small numbers (1-10) as they're usually structural
        if num <= 10:
            continue
        # Check if number or its rounded variants are in allowed set
        if num not in allowed and round(num) not in allowed:
            # Check nearest thousand
            if round(num / 1000) * 1000 not in allowed:
                unmatched.append(str(int(num) if num == int(num) else num))

    is_valid = len(unmatched) == 0
    return is_valid, unmatched


# Regeneration instruction appended when validator fails
REGENERATION_INSTRUCTION = (
    "IMPORTANT: Your previous reply contained numbers not found in tool results: {unmatched}. "
    "Use ONLY numbers from tool results. Do not use any numbers from your training data."
)

# Safe fallback when validator fails twice
SAFE_FALLBACK = {
    "en": "I want to give you accurate information, but I need to verify some numbers. Let me connect you with a counsellor who can help.",
    "hi": "मैं आपको सही जानकारी देना चाहता हूँ, लेकिन मुझे कुछ संख्याओं की पुष्टि करनी होगी। मैं आपको एक काउंसलर से जोड़ता हूँ।",
    "te": "నేను మీకు సరైన సమాచారం ఇవ్వాలనుకుంటున్నాను, కానీ కొన్ని సంఖ్యలను ధృవీకరించాల్సి ఉంది. మిమ్మల్ని ఒక కౌన్సెలర్‌కు కనెక్ట్ చేస్తాను.",
}
