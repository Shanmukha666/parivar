from pydantic import BaseModel, UUID4, Field, model_validator, field_validator
from typing import List, Optional, Any, Dict, Literal
from datetime import datetime
import re

class SessionCreate(BaseModel):
    lang: Literal["en", "hi", "te", "ta"]
    state: str = Field(..., min_length=2, max_length=40)
    district: str = Field(..., min_length=2, max_length=40)
    user_role: Literal["learner", "parent", "both"]
    learner_class: str = Field(..., min_length=1, max_length=30)
    income_bracket: str = Field(..., min_length=1, max_length=30)
    consent: Literal[True]
    selected_trade_id: Optional[int] = None
    learner_age: Optional[int] = Field(None, ge=1, le=120)
    guardian_consent: bool = False

    @model_validator(mode="after")
    def validate_guardian_consent(self):
        if self.learner_age is not None and self.learner_age < 18 and not self.guardian_consent:
            raise ValueError("guardian_consent is required for learners under 18")
        return self

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
    concern_state: Dict[str, Any] = Field(default_factory=dict)

class ChatRequest(BaseModel):
    session_id: UUID4
    speaker: Literal["learner", "parent"]
    text: str = Field(..., min_length=1, max_length=1000)
    lang: Literal["en", "hi", "te", "ta"]

class ChatResponse(BaseModel):
    reply: str
    citations: List[str]
    suggested_chips: List[str]
    escalate: bool

class JointAnswerRequest(BaseModel):
    session_id: UUID4
    participant: Literal["learner", "parent"]
    answers: Dict[str, str] = Field(..., min_length=1)
    request_escalation: bool = False

    @field_validator("answers")
    @classmethod
    def validate_questions(cls, value):
        allowed = {"preferred_trade", "top_priority", "preferred_location"}
        if not set(value).issubset(allowed):
            raise ValueError("answers contain unsupported questions")
        if any(not str(item).strip() for item in value.values()):
            raise ValueError("answers cannot be blank")
        return value

class TradeResponse(BaseModel):
    id: int
    name_en: str
    sector: str

class OutcomeResponse(BaseModel):
    placement_rate: Optional[float]
    avg_start_salary_inr: Optional[int]
    sample_size: Optional[int]

class MetricIngest(BaseModel):
    trade_id: int = Field(..., gt=0)
    provider_id: Optional[int] = Field(None, gt=0)
    state: str = Field(..., min_length=2, max_length=80)
    district: Optional[str] = Field(None, min_length=2, max_length=80)
    metric_key: Literal[
        "placement_rate", "starting_earnings", "earnings_after_period",
        "self_employment_rate", "job_roles", "progression", "nsqf_level"
    ]
    metric_value: Optional[float] = None
    metric_text: Optional[str] = Field(None, max_length=2000)
    unit: str = Field(..., min_length=1, max_length=40)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    sample_size: Optional[int] = Field(None, ge=0)
    publisher: str = Field(..., min_length=1, max_length=200)
    source_title: str = Field(..., min_length=1, max_length=300)
    source_url: Optional[str] = None
    document_reference: Optional[str] = None
    verification_date: Optional[datetime] = None
    verification_status: Literal["verified", "pending", "rejected"] = "pending"
    data_quality: Literal["high", "medium", "low", "unknown"] = "unknown"
    confidence: Optional[float] = Field(None, ge=0, le=1)
    is_synthetic: bool = False

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value):
        if value is not None and not value.startswith(("https://", "http://")):
            raise ValueError("source_url must use http or https")
        return value

    @model_validator(mode="after")
    def validate_provenance(self):
        if not self.source_url and not self.document_reference:
            raise ValueError("source_url or document_reference is required")
        if self.metric_value is None and not self.metric_text:
            raise ValueError("metric_value or metric_text is required")
        if self.verification_status == "verified" and self.is_synthetic:
            raise ValueError("synthetic data cannot be verified")
        if self.metric_key in {"placement_rate", "self_employment_rate"} and (
            self.metric_value is None or not 0 <= self.metric_value <= 100
        ):
            raise ValueError("percentage metrics must be between 0 and 100")
        return self

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
    concern_category: Optional[str] = Field(None, max_length=80)
    priority: str = Field("normal", pattern=r"^(normal|high|urgent)$")
    callback_phone: Optional[str] = Field(None, pattern=r"^[6-9][0-9]{9}$")
    callback_slot: Optional[str] = Field(None, max_length=80)

class EscalationResponse(BaseModel):
    id: int
    session_id: UUID4
    reason: str
    concern_category: Optional[str] = None
    priority: str
    status: str
    created_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    contacted_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    counsellor_id: Optional[UUID4] = None
    resolution_note: Optional[str] = None

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
