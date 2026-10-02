# Architecture Document — Parivar Path

## 1. Overview

Parivar Path is a multilingual, voice-first AI counselling platform that engages Indian families
(learners + parents) in career guidance for vocational education. The system combines conversational
AI with a verified outcome-data backend, human escalation, and an analytics dashboard.

## 2. System Components

### 2.1 Family PWA (Next.js 14)
- **Purpose**: User-facing progressive web app for families
- **Tech**: Next.js 14, TypeScript, Tailwind CSS, Web Speech API
- **Key features**: Voice I/O, i18n (EN/HI/TE), icon-driven UI, offline caching
- **Accessibility**: 48px targets, high contrast, Class 5 reading level

### 2.2 FastAPI Backend
- **Purpose**: API layer, AI orchestration, data access
- **Tech**: Python 3.11, FastAPI, SQLAlchemy 2 (async), Pydantic v2
- **Sub-components**:
  - **Orchestrator**: Manages LLM conversation loop with tool calling
  - **Tool Layer**: Typed SQL queries with source metadata
  - **Classifier**: Objection categorisation + sentiment scoring
  - **Validator**: Ensures all numbers in AI output come from tool results
  - **Escalation Engine**: Auto-detects when human help is needed

### 2.3 PostgreSQL Database
- **Purpose**: Primary data store
- **Schema**: 12 tables covering trades, outcomes, sessions, messages, analytics
- **Key design**: JSONB for multilingual fields, district-level granularity

### 2.4 Redis
- **Purpose**: Session caching, escalation queue, real-time messaging
- **Usage**: WebSocket message relay, counsellor queue management

### 2.5 Claude API (Anthropic)
- **Purpose**: LLM backbone for conversational counselling
- **Integration**: Tool-calling protocol, structured JSON output
- **Safety**: All factual claims must be tool-grounded

## 3. Request Flow (Chat Turn)

```
1. Client → POST /chat {session_id, speaker, text, lang}
2. Backend stores message in DB
3. Classifier runs async: objection_category + sentiment → message_analysis
4. Orchestrator builds system prompt with:
   - Session profile (state, district, class, income)
   - Conversation history
   - Tool schemas
5. LLM requests tools (get_outcomes, get_pathway, etc.)
6. Backend executes SQL queries, returns typed results
7. LLM produces final answer with citations[]
8. Validator checks every number against tool results
   - If invalid: regenerate once with "Use only numbers from tool results"
   - Second failure: safe fallback message + escalate=true
9. Escalation engine evaluates triggers
10. Response returned to client: {reply, citations, suggested_chips, escalate}
```

## 4. Data Flow Diagram

```
Family (voice/text)
    │
    ▼
[Web Speech API] ──── STT ────┐
    │                          │
    ▼                          ▼
[Next.js PWA] ──── POST /chat ────→ [FastAPI]
                                        │
                    ┌───────────────────┤
                    ▼                   ▼
              [Classifier]      [Orchestrator]
                    │                   │
                    ▼                   ▼
           [message_analysis]    [Claude API]
                                        │
                                   tool calls
                                        │
                               ┌────────┴────────┐
                               ▼                 ▼
                        [PostgreSQL]        [Tool Layer]
                               │                 │
                               └────────┬────────┘
                                        ▼
                                   [Validator]
                                        │
                                        ▼
                                [Escalation Check]
                                        │
                                        ▼
                                   JSON Response
                                        │
                                        ▼
                                   [PWA renders]
                                        │
                                        ▼
                                   [TTS output]
```

## 5. Outcome Data Fallback Logic

```python
def get_outcomes(trade_id, district, state):
    # 1. Try district-level data
    district_data = query(trade_id=trade_id, district=district)
    if district_data.sample_size >= 20:
        return district_data, scope="district"
    
    # 2. Fall back to state-level data
    state_data = query(trade_id=trade_id, state=state)
    return state_data, scope="state", 
           label="State-level data, not your district"
```

## 6. Escalation Triggers

| Trigger | Condition |
|---------|-----------|
| Explicit request | User says "talk to counsellor" or taps button |
| Persistent negativity | 3 consecutive parent messages with sentiment < -0.4 |
| Missing data | No tool data and user asks for facts twice |
| Sensitive keywords | "unsafe", "accident", "injury", "family fight", "debt", "harassment" |
| Validator failure | Number validator failed twice |

## 7. Resistance Index

```
resistance_index(district) = 
    0.5 × negative_start_sentiment_share 
  + 0.3 × escalation_rate 
  + 0.2 × (1 − mean_sentiment_shift_normalised)

Normalised to 0–100
```

Where:
- `negative_start_sentiment_share` = proportion of parent sessions starting with sentiment < 0
- `escalation_rate` = escalations / total sessions in district
- `mean_sentiment_shift_normalised` = (end_sentiment - start_sentiment + 2) / 4, clipped to [0,1]

## 8. Security Model

| Layer | Mechanism |
|-------|-----------|
| Authentication | JWT tokens for staff (admin, counsellor) |
| Authorisation | Role-based access (admin sees all, counsellor sees queue) |
| Data minimisation | No Aadhaar, no exact address, district-level only |
| Transport | HTTPS in production |
| Input validation | Pydantic schemas, SQL parameterisation |
| Prompt injection | User text sandboxed, tools allow-listed |
| Privacy | k-anonymity threshold (hide cells < 10 sessions) |
| Retention | Callback phones deleted after resolution; sessions purge at 90 days |

## 9. Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind | PWA support, SSR, modern React |
| Backend | FastAPI + Python 3.11 | Async, auto-docs, Pydantic |
| Database | PostgreSQL 16 | JSONB, arrays, reliable |
| Cache/Queue | Redis 7 | Fast, pub/sub for WebSocket |
| LLM | Claude (Anthropic) | Tool calling, multilingual |
| Voice | Web Speech API | Browser-native, no extra cost |
| Charts | Recharts | React-native, customisable |
| Maps | Leaflet | Open-source, lightweight |
| Containerisation | Docker Compose | Easy dev and deploy |

## 10. Deployment

### Development
```bash
docker-compose up -d   # PostgreSQL + Redis + API + Web
```

### Production (recommended)
- Cloud Run or ECS for API and Web
- Cloud SQL or RDS for PostgreSQL
- Elasticache or Memorystore for Redis
- CloudFront or Cloud CDN for PWA static assets
- Let's Encrypt for HTTPS
