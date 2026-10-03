from sqlalchemy import Column, Integer, String, Boolean, Numeric, Date, ForeignKey, DateTime, BigInteger, Text, JSON, Uuid
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
import uuid
from app.database import Base
from sqlalchemy.sql import func

UniversalJSON = JSON().with_variant(PG_JSONB, "postgresql")
UniversalUUID = Uuid(as_uuid=True)

class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    name_en = Column(Text)
    name_local = Column(UniversalJSON)
    sector = Column(Text)
    nsqf_level = Column(Integer)
    duration_months = Column(Integer)
    entry_qualification = Column(Text)
    safety_notes = Column(Text)
    job_roles = Column(UniversalJSON)
    description_simple = Column(UniversalJSON)

class Provider(Base):
    __tablename__ = "providers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text)
    type = Column(Text)
    state = Column(Text)
    district = Column(Text)
    accreditation = Column(Text)
    fee_inr = Column(Integer)
    contact = Column(Text)
    verified = Column(Boolean, nullable=False, default=False)
    is_synthetic = Column(Boolean, nullable=False, default=False)
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class Outcome(Base):
    __tablename__ = "outcomes"
    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id"), index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"))
    state = Column(Text)
    district = Column(Text, index=True)
    cohort_year = Column(Integer)
    placement_rate = Column(Numeric)
    avg_start_salary_inr = Column(Integer)
    salary_3yr_min = Column(Integer)
    salary_3yr_max = Column(Integer)
    self_employment_rate = Column(Numeric)
    sample_size = Column(Integer)
    source = Column(Text)
    verified_on = Column(Date)
    verified = Column(Boolean, nullable=False, default=False)
    is_synthetic = Column(Boolean, nullable=False, default=False)
    evidence_url = Column(Text)
    review_status = Column(Text, nullable=False, default="pending_data_review")

class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, index=True)
    publisher = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    source_url = Column(Text)
    document_reference = Column(Text)
    retrieved_on = Column(Date)

class OutcomeMetric(Base):
    __tablename__ = "outcome_metrics"
    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"))
    state = Column(Text, nullable=False)
    district = Column(Text, index=True)
    metric_key = Column(Text, nullable=False)
    metric_value = Column(Numeric)
    metric_text = Column(Text)
    unit = Column(Text, nullable=False)
    period_start = Column(Date)
    period_end = Column(Date)
    year = Column(Integer)
    sample_size = Column(Integer)
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)
    verification_date = Column(Date)
    verification_status = Column(Text, nullable=False, default="pending")
    data_quality = Column(Text, nullable=False, default="unknown")
    confidence = Column(Numeric)
    is_synthetic = Column(Boolean, nullable=False, default=False)

class Pathway(Base):
    __tablename__ = "pathways"
    id = Column(Integer, primary_key=True, index=True)
    from_trade_id = Column(Integer, ForeignKey("trades.id"))
    step_order = Column(Integer)
    step_title = Column(Text)
    nsqf_level = Column(Integer)
    next_education = Column(Text)
    typical_role = Column(Text)
    typical_salary_range = Column(Text)
    source_id = Column(Integer, ForeignKey("data_sources.id"))
    verification_status = Column(Text, nullable=False, default="pending")
    is_synthetic = Column(Boolean, nullable=False, default=False)

class Scheme(Base):
    __tablename__ = "schemes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text)
    state = Column(Text)
    eligibility = Column(UniversalJSON)
    benefit = Column(Text)
    how_to_apply = Column(Text)
    source = Column(Text)

class Story(Base):
    __tablename__ = "stories"
    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer)
    district = Column(Text)
    name = Column(Text)
    quote = Column(UniversalJSON)
    outcome = Column(Text)
    verified = Column(Boolean, nullable=False, default=False)
    is_synthetic = Column(Boolean, default=True)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(UniversalUUID, primary_key=True, default=uuid.uuid4)
    owner_id = Column(UniversalUUID, nullable=False, index=True)
    lang = Column(Text)
    state = Column(Text)
    district = Column(Text, index=True)
    user_role = Column(Text)
    learner_class = Column(Text)
    income_bracket = Column(Text)
    selected_trade_id = Column(Integer)
    learner_age = Column(Integer)
    guardian_consent = Column(Boolean, nullable=False, default=False)
    concern_state = Column(UniversalJSON, nullable=False, default=lambda: {
        "initial_concerns": [],
        "evidence_presented": [],
        "current_concerns": [],
        "unresolved_concerns": [],
        "escalation_status": "not_escalated",
    })
    joint_counselling_state = Column(UniversalJSON, nullable=False, default=lambda: {
        "mode": "not_started",
        "status": "not_started",
        "answers": {},
        "comparison": None,
        "counselling_plan": None,
        "evidence_discussed": [],
        "unresolved": False,
        "escalation_status": "not_escalated",
    })
    consent = Column(Boolean)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer().with_variant(BigInteger, "postgresql"), primary_key=True, autoincrement=True)
    session_id = Column(UniversalUUID, index=True)
    speaker = Column(Text)
    text = Column(Text)
    lang = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MessageAnalysis(Base):
    __tablename__ = "message_analysis"
    message_id = Column(Integer().with_variant(BigInteger, "postgresql"), primary_key=True)
    objection_category = Column(Text)
    sentiment = Column(Numeric)
    intent = Column(Text)
    concerns = Column(UniversalJSON, nullable=False, default=list)
    concern_intensity = Column(Text, nullable=False, default="LOW")

class Escalation(Base):
    __tablename__ = "escalations"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(UniversalUUID)
    reason = Column(Text)
    concern_category = Column(Text)
    summary = Column(Text)
    status = Column(Text, default='new', index=True)
    priority = Column(Text, default='normal', index=True)
    counsellor_id = Column(UniversalUUID)
    callback_phone = Column(Text)
    callback_slot = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True))
    contacted_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    resolution_note = Column(Text)

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer().with_variant(BigInteger, "postgresql"), primary_key=True, autoincrement=True)
    session_id = Column(UniversalUUID, index=True)
    type = Column(Text)
    meta = Column(UniversalJSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(Text, unique=True, index=True)
    password_hash = Column(Text)
    role = Column(Text)
