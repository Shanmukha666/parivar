# Parivar engineering guidance

Parivar is an AI-assisted family counselling platform for vocational career decisions. The system helps learners and parents jointly evaluate vocational pathways using verified evidence, local context, multilingual conversation, human counsellor escalation, and administrator decision intelligence.

The product must **not** become a generic chatbot. Its flow is:

`UNDERSTAND → INVESTIGATE → VERIFY → EXPLAIN → REASSESS → ACT`

The final product output is a Family Decision Plan, not merely an AI answer.

## Architecture

Use the existing architecture unless there is a strong reason to change it:

- Next.js: frontend, PWA, and UI
- FastAPI: application and AI orchestration
- Supabase: PostgreSQL, Auth, RLS, Storage, and Realtime
- LLM providers: accessed through FastAPI
- Evidence acquisition: controlled backend service

Do not introduce another backend framework, microservice architecture, Kafka, Kubernetes, or unnecessary infrastructure. Supabase stores facts and state; FastAPI decides what to do with those facts. Do not put core business logic, AI orchestration, evidence verification, or security-sensitive decisions in the frontend.

## Evidence and LLMs

LLMs are not sources of truth. Every quantitative claim must come from structured evidence. Never fabricate salary, placement or employment rates, training availability, provider outcomes, job counts, government statistics, sample sizes, sources, citations, or verification status. If reliable evidence is unavailable, explicitly return an evidence gap.

Every evidence record must preserve provenance. At minimum track:

- source and source URL or document reference
- publication date and retrieved date when available
- metric, value, unit, location, trade, and sample size when available
- authority level, freshness, verification status, extraction method, parser version, confidence, and synthetic/demo flag

Synthetic/demo data must never appear as verified real-world evidence. Prefer official APIs, official downloadable datasets, official public documents/PDFs, RSS/feeds, then permitted public HTML extraction. Respect robots.txt, terms of service, rate limits, copyright/licensing, authentication requirements, and access restrictions. Never bypass CAPTCHAs, paywalls, login controls, or technical restrictions. Scraped content must enter the same evidence-validation pipeline as other sources.

Keep authority, freshness, relevance, verification, sample size, and confidence separate. Do not equate recent information with authoritative information. Never silently choose between conflicting sources: represent the conflict and explain why sources may differ.

## Agents and domain model

Agents must have narrow responsibilities. Preferred agents are Concern, Evidence, Verification, Pathway, Counselling, and Escalation agents. Do not create agents merely to make the architecture look sophisticated.

Agents must produce structured outputs and those outputs must be validated with typed schemas before use. Agents must not write directly to Supabase:

`agent → schema validation → business rules → repository/service → Supabase`

The Family Decision Case is the primary domain object. It should capture learner preferences; parent and learner concerns; disagreements; shared goals; evidence presented and gaps; concern-state history; decision confidence; escalation state; final decision; and next action. A chat session is an interface to the case, not the case itself.

Use concern states rather than psychological claims, for example:

`INITIAL → EVIDENCE_PRESENTED → REASSESSED → RESOLVED / PARTIALLY_RESOLVED / UNRESOLVED`

Do not claim to diagnose emotions or psychological states.

## Privacy and experience

Minimize collecting names, phone numbers, household income, location, academic information, voice data, and conversation history. Use consent and RLS. Do not expose PII in aggregate administrator dashboards.

Design for low literacy and digital familiarity: mobile-first use, large touch targets, one question at a time, simple language, useful icons, voice input, read-aloud/TTS, and regional languages. Do not make the interface look like a developer dashboard.

## Implementation and verification

Every significant feature must include unit, API, database/RLS where relevant, agent-schema, evidence-validation, and failure-path tests. Never claim a feature is complete without running the relevant tests.

Before changing code:

1. Inspect the existing implementation and reusable code.
2. Check the database schema, API contracts, and existing tests.
3. Make the smallest coherent change.
4. Do not rewrite working parts unnecessarily.

After changing code:

1. Run relevant tests and lint/type checks.
2. Inspect the diff.
3. Report files changed, tests actually run, and remaining risks.
4. Never say an implementation succeeded if it was not verified.

Do not turn Parivar into a generic chatbot, RAG demo, sentiment-analysis app, job portal, or career-recommendation engine. Its differentiators are family disagreement mapping, concern-specific evidence retrieval, evidence verification and conflict detection, evidence gaps, family decision confidence and plan, counsellor copilot, and administrator evidence-gap intelligence.

When uncertain, prefer a transparent limitation over fabricated functionality.
