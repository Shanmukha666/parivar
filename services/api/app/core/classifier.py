"""
Sentiment and objection classifier.
PRD section 6.4.
Uses LLM when available, falls back to keyword-based classification.
"""

import json
import logging
import os
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.prompts import CLASSIFIER_PROMPT

logger = logging.getLogger(__name__)

import re

# ── Keyword-based fallback classifier ──────────────────────────────────

OBJECTION_KEYWORDS = {
    "income": [
        "salary", "earn", "money", "income", "paisa", "kamai", "rupee", "₹",
        "kitna milega", "salary kitni", "tankhah", "jeetha", "sambhaadane",
        "वेतन", "कमाई", "पैसे", "జీతం", "డబ్బు"
    ],
    "safety": [
        "safe", "danger", "injury", "accident", "risk", "suraksha", "khatrnak",
        "chot", "surakshit", "bhayam", "praman", "सुरक्षा", "खतरा", "భద్రత", "ప్రమాదం"
    ],
    "status": [
        "respect", "izzat", "status", "log kya kahenge", "relatives",
        "society", "shame", "samaj", "gauravam", "pratishtita", "इज़्ज़त", "समाज", "గౌరవం"
    ],
    "job_security": [
        "job milegi", "naukri", "employment", "permanent", "stable",
        "udyogam", "kaam", "rozgaar", "नौकरी", "रोजगार", "ఉద్యోగం"
    ],
    "degree_pref": [
        "degree", "college", "university", "b.tech", "engineering",
        "graduation", "padhai", "digri", "ba", "bsc", "bcom", "डिग्री", "कॉलेज", "డిగ్రీ"
    ],
    "cost": [
        "cost", "fee", "fees", "expensive", "afford", "kharcha", "fees kitni",
        "meeda", "kharchalu", "paisa lagega", "खर्चा", "फीस", "ఫీజు", "ఖర్చు"
    ],
}

CONCERN_CATEGORIES = (
    "income_potential",
    "job_security",
    "social_perception_status",
    "safety",
    "further_education",
    "career_progression",
    "training_quality",
    "migration_location",
    "family_affordability",
    "gender_family_concerns",
    "recognition_of_qualification",
    "other_unknown",
)

CONCERN_KEYWORDS = {
    "income_potential": [
        "salary", "earn", "income", "paisa", "kamai", "rupee", "₹",
        "वेतन", "कमाई", "पैसे", "జీతం", "డబ్బు",
    ],
    "job_security": [
        "job", "naukri", "employment", "permanent", "stable", "rozgaar",
        "नौकरी", "रोजगार", "मिलेगी", "ఉద్యోగం", "ఉద్యోగం వస్తుందా",
    ],
    "social_perception_status": [
        "respect", "izzat", "status", "relatives", "society", "shame",
        "समाज", "इज़्ज़त", "लोग क्या कहेंगे", "గౌరవం",
    ],
    "safety": [
        "safe", "danger", "injury", "accident", "risk", "suraksha",
        "सुरक्षा", "खतरा", "భద్రత", "ప్రమాదం",
    ],
    "further_education": [
        "degree", "college", "university", "b.tech", "engineering",
        "graduation", "डिग्री", "कॉलेज", "చదువు", "కాలేజీ",
    ],
    "career_progression": [
        "growth", "promotion", "career path", "progress", "future",
        "तरक्की", "करियर", "ఎదుగుదల", "కెరీర్",
    ],
    "training_quality": [
        "quality", "trainer", "instructor", "equipment", "course good",
        "गुणवत्ता", "प्रशिक्षक", "శిక్షణ నాణ్యత", "ట్రైనర్",
    ],
    "migration_location": [
        "away", "relocate", "migration", "move", "city", "near home",
        "दूर", "स्थान बदल", "शहर", "ఇంటి దగ్గర", "వలస",
    ],
    "family_affordability": [
        "cost", "fee", "fees", "expensive", "afford", "kharcha",
        "खर्चा", "फीस", "ఖర్చు", "ఫీజు",
    ],
    "gender_family_concerns": [
        "daughter", "girl", "women", "marriage", "family permission",
        "बेटी", "लड़की", "महिला", "शादी", "కూతురు", "అమ్మాయి",
    ],
    "recognition_of_qualification": [
        "certificate valid", "recognised", "recognition", "मान्यता",
        "प्रमाणपत्र", "certificate", "గుర్తింపు", "సర్టిఫికేట్",
    ],
}

HIGH_INTENSITY_MARKERS = (
    "urgent", "very worried", "afraid", "fear", "must", "no way",
    "क्या होगा", "मिलेगी क्या", "जरूरी", "చాలా భయం", "వస్తుందా",
)

def _contains(text: str, phrase: str) -> bool:
    return phrase.lower() in text.lower()


def classify_concerns(text: str, speaker: str = "parent") -> dict:
    """Classify concern state, not mental health or emotion diagnosis."""
    if speaker not in {"parent", "learner", "counsellor"}:
        speaker = "parent"
    matches = []
    for category, keywords in CONCERN_KEYWORDS.items():
        if any(_contains(text, keyword) for keyword in keywords):
            matches.append(category)
    if not matches:
        matches = ["other_unknown"]
    question_or_strong = "?" in text or any(_contains(text, marker) for marker in HIGH_INTENSITY_MARKERS)
    intensity = "HIGH" if question_or_strong and len(matches) > 0 else "MEDIUM"
    if len(text.split()) <= 3 and not question_or_strong:
        intensity = "LOW"
    return {
        "concerns": matches,
        "concern_intensity": intensity,
        "classification_basis": "deterministic_keyword_fallback",
        "is_diagnostic": False,
    }

NEGATIVE_WORDS = [
    "no", "nahi", "never", "worst", "useless", "waste", "bekar",
    "kharab", "problem", "worried", "fear", "doubt", "ledu", "vaddu",
    "cheppaku", "mushkil", "dikkat", "नहीं", "बेकार", "వద్దు", "లేదు"
]

POSITIVE_WORDS = [
    "yes", "good", "great", "ok", "sure", "interested", "achha", "badhiya",
    "sahi", "theek", "chalega", "haan", "ji", "bagundi", "manchidi",
    "avunu", "happy", "excited", "हाँ", "अच्छा", "అవును", "బాగుంది"
]

REQUEST_HUMAN_WORDS = [
    "counsellor", "counselor", "talk to someone",
    "call me", "phone me", "call human", "real person", "insaan se", "manishi tho",
    "काउंसलर", "మాట్లాడాలి"
]

SENSITIVE_WORDS = [
    "unsafe", "accident", "injury", "family fight", "debt", "harassment",
    "suicide", "abuse", "violence", "maar", "ladai", "hinsa", "हिंसा", "అప్పు"
]


def _keyword_classify(text: str, speaker: str) -> dict:
    """Fallback keyword-based classifier."""
    text_lower = text.lower()

    def has_match(word_list, text):
        for w in word_list:
            if re.search(r'\b' + re.escape(w) + r'\b', text):
                return True
        return False

    def count_matches(word_list, text):
        return sum(1 for w in word_list if re.search(r'\b' + re.escape(w) + r'\b', text))

    # Detect objection category
    category = "none"
    for cat, keywords in OBJECTION_KEYWORDS.items():
        if has_match(keywords, text_lower):
            category = cat
            break

    # Sentiment scoring
    neg_count = count_matches(NEGATIVE_WORDS, text_lower)
    pos_count = count_matches(POSITIVE_WORDS, text_lower)
    
    # Specific fix: 'know nothing' -> ignore 'nothing' as purely negative sentiment
    if "know nothing" in text_lower:
        neg_count -= 1

    word_count = max(len(text_lower.split()), 1)

    if neg_count > pos_count:
        sentiment = max(-1.0, -0.3 - (neg_count / word_count))
    elif pos_count > neg_count:
        sentiment = min(1.0, 0.3 + (pos_count / word_count))
    else:
        sentiment = 0.0

    # Intent detection
    intent = "other"
    if has_match(REQUEST_HUMAN_WORDS, text_lower):
        intent = "request_human"
    elif has_match(SENSITIVE_WORDS, text_lower):
        intent = "request_human"
    elif category != "none":
        if sentiment < -0.2:
            intent = "express_concern"
        else:
            intent = "ask_info"
    elif sentiment > 0.3:
        intent = "express_acceptance"
    else:
        intent = "ask_info"

    concern_state = classify_concerns(text, speaker)
    return {
        "speaker_role": speaker,
        "objection_category": category,
        "sentiment": round(sentiment, 2),
        "intent": intent,
        "language": "en",  # default; real version detects
        **concern_state,
    }


async def classify_message(
    text: str,
    speaker: str = "learner",
    api_key: Optional[str] = None,
) -> dict:
    """
    Classify a message for objection category, sentiment and intent.
    Tries LLM first, falls back to keyword classifier.
    """
    # Try LLM classification if API key is available
    if api_key or os.getenv("ANTHROPIC_API_KEY"):
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(
                api_key=api_key or os.getenv("ANTHROPIC_API_KEY")
            )
            prompt = CLASSIFIER_PROMPT.format(text=text, speaker=speaker)

            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )

            result_text = response.content[0].text.strip()
            # Parse JSON from response
            if result_text.startswith("{"):
                result = json.loads(result_text)
                deterministic = classify_concerns(text, speaker)
                result["concerns"] = sorted(set(result.get("concerns", [])) & set(CONCERN_CATEGORIES)) or deterministic["concerns"]
                result["concern_intensity"] = result.get("concern_intensity") if result.get("concern_intensity") in {"LOW", "MEDIUM", "HIGH"} else deterministic["concern_intensity"]
                result["is_diagnostic"] = False
                return result
            # Try to find JSON in response
            import re
            json_match = re.search(r'\{[^{}]+\}', result_text)
            if json_match:
                result = json.loads(json_match.group())
                deterministic = classify_concerns(text, speaker)
                result["concerns"] = sorted(set(result.get("concerns", [])) & set(CONCERN_CATEGORIES)) or deterministic["concerns"]
                result["concern_intensity"] = result.get("concern_intensity") if result.get("concern_intensity") in {"LOW", "MEDIUM", "HIGH"} else deterministic["concern_intensity"]
                result["is_diagnostic"] = False
                return result

        except Exception as e:
            logger.warning(f"LLM classifier failed, using keyword fallback: {e}")

    # Fallback to keyword-based classification
    return _keyword_classify(text, speaker)


async def store_classification(
    message_id: int,
    classification: dict,
    db: AsyncSession,
) -> None:
    """Store classification result in message_analysis table."""
    from app.models.models import MessageAnalysis

    analysis = MessageAnalysis(
        message_id=message_id,
        objection_category=classification.get("objection_category", "none"),
        sentiment=classification.get("sentiment", 0.0),
        intent=classification.get("intent", "other"),
        concerns=classification.get("concerns", ["other_unknown"]),
        concern_intensity=classification.get("concern_intensity", "MEDIUM"),
    )
    db.add(analysis)
    await db.commit()


def update_concern_state(
    session,
    classification: dict,
    *,
    evidence_presented: list[dict] | None = None,
    escalation_status: str | None = None,
) -> dict:
    """Update session concern state; this is tracking, not psychological diagnosis."""
    previous = dict(session.concern_state or {})
    initial = list(previous.get("initial_concerns", []))
    current = list(previous.get("current_concerns", []))
    unresolved = list(previous.get("unresolved_concerns", []))
    concerns = classification.get("concerns", ["other_unknown"])
    for concern in concerns:
        if concern not in initial:
            initial.append(concern)
        if concern not in current:
            current.append(concern)
        if concern not in unresolved:
            unresolved.append(concern)
    presented = list(previous.get("evidence_presented", []))
    for evidence in evidence_presented or []:
        if evidence not in presented:
            presented.append(evidence)
    state = {
        "initial_concerns": initial,
        "evidence_presented": presented,
        "current_concerns": current,
        "unresolved_concerns": unresolved,
        "current_intensity": classification.get("concern_intensity", "MEDIUM"),
        "escalation_status": escalation_status or previous.get("escalation_status", "not_escalated"),
        "is_diagnostic": False,
    }
    session.concern_state = state
    return state
