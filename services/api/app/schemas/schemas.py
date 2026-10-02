from pydantic import BaseModel, UUID4
from typing import List, Optional, Any, Dict
from datetime import datetime

class SessionCreate(BaseModel):
    lang: str
    state: str
    district: str
    user_role: str
    learner_class: str
    income_bracket: str
    consent: bool

class SessionResponse(BaseModel):
    id: UUID4
    lang: str
    state: str
    district: str
    user_role: str
    learner_class: str
    income_bracket: str
    created_at: datetime

class ChatRequest(BaseModel):
    session_id: UUID4
    speaker: str
    text: str
    lang: str

class ChatResponse(BaseModel):
    reply: str
    citations: List[str]
    suggested_chips: List[str]
    escalate: bool

class TradeResponse(BaseModel):
    id: int
    name_en: str
    sector: str

class OutcomeResponse(BaseModel):
    placement_rate: Optional[float]
    avg_start_salary_inr: Optional[int]
    sample_size: Optional[int]

class PathwayResponse(BaseModel):
    steps: List[Dict[str, Any]]

class ProviderResponse(BaseModel):
    id: int
    name: str

class SchemeResponse(BaseModel):
    id: int
    name: str

class EscalationCreate(BaseModel):
    session_id: UUID4
    reason: str
    callback_phone: Optional[str] = None
    callback_slot: Optional[str] = None

class EscalationResponse(BaseModel):
    id: int
    session_id: UUID4
    status: str

class AdminMetrics(BaseModel):
    total_sessions: int

class AdminInsight(BaseModel):
    insight: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class SummaryCardRequest(BaseModel):
    session_id: UUID4
