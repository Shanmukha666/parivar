"""Normalise Indic digits to ASCII so the number validator works across languages."""
import re

_DIGIT_RANGES = {
    "devanagari": 0x0966,
    "tamil": 0x0BE6,
    "telugu": 0x0C66,
}
_TABLE = {}
for start in _DIGIT_RANGES.values():
    for i in range(10):
        _TABLE[chr(start + i)] = str(i)


def normalize_digits(text: str) -> str:
    return "".join(_TABLE.get(ch, ch) for ch in text)


def extract_numbers(text: str) -> set[str]:
    text = normalize_digits(text).replace(",", "")
    return set(re.findall(r"\d+(?:\.\d+)?", text))


def numbers_grounded(reply: str, tool_numbers: set[str]) -> bool:
    """True if every number in the reply appears in tool results."""
    return extract_numbers(reply) <= tool_numbers


if __name__ == "__main__":
    assert normalize_digits("७८ में से") == "78 में से"
    assert normalize_digits("௭௮ சதவீதம்") == "78 சதவீதம்"
    assert normalize_digits("౭౮ శాతం") == "78 శాతం"
    print("ok")
