from pydantic import BaseModel, UUID4, Field
from typing import List, Optional, Any, Dict, Literal
from datetime import datetime
import re

class SessionCreate(BaseModel):
    lang: Literal["en", "hi", "te"]
    state: str = Field(..., min_length=2, max_length=40)
    district: str = Field(..., min_length=2, max_length=40)
    user_role: Literal["learner", "parent", "both"]
    learner_class: str = Field(..., min_length=1, max_length=30)
    income_bracket: str = Field(..., min_length=1, max_length=30)
    consent: Literal[True]
    selected_trade_id: Optional[int] = None

class SessionUpdate(BaseModel):
    selected_trade_id: int = Field(..., gt=0)

class SessionResponse(BaseModel):
    id: UUID4
    lang: str
    state: str
    district: str
    user_role: str
    learner_class: str
    income_bracket: str
    created_at: datetime
    selected_trade_id: Optional[int] = None

class ChatRequest(BaseModel):
    session_id: UUID4
    speaker: Literal["learner", "parent"]
    text: str = Field(..., min_length=1, max_length=1000)
    lang: Literal["en", "hi", "te"]

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
    reason: str = Field(..., max_length=1000)
    callback_phone: Optional[str] = Field(None, pattern=r"^[6-9][0-9]{9}$")
    callback_slot: Optional[str] = Field(None, max_length=80)

class EscalationResponse(BaseModel):
    id: int
    session_id: UUID4
    status: str

class TicketResolution(BaseModel):
    resolution_note: str = Field("Resolved via counsellor consultation", max_length=2000)

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
