# Product Requirements Document — Parivar Path

## Problem Statement
**SIH #26241** — AI-Enabled Career Counselling and Family Decision-Support Platform for Vocational Education

### One-line Summary
A multilingual, voice-first AI counsellor that talks to the learner and parents together, answers parental objections about vocational training with verified local outcome data, escalates to human counsellors when needed, and shows scheme administrators where and why family resistance is concentrated.

### Problem
Vocational enrolment and retention are limited by family perception (low status, doubtful earnings, safety, "degree is better"). Existing tools only guide the learner. Parents, who often decide, are unserved — especially in rural and semi-urban homes.

### Goals
1. Reduce parental resistance through credible, localised, data-backed answers
2. Give families a shared, jargon-free view of a trade: cost, duration, earnings, growth path
3. Give administrators actionable visibility on resistance by district, trade and objection type
4. Be usable by low-literacy, low-digital-familiarity users

### Non-goals (hackathon scope)
- Course enrolment or payment
- Real-time live data integration with government systems
- Native mobile apps

---

## Personas

| Persona | Description | Key Need |
|---------|------------|----------|
| **Learner** (Ravi, 17) | Class 10/12 pass, interested in trades, phone-comfortable | Convince family, choose a trade |
| **Parent** (Sunita, 42) | Limited schooling, speaks regional language, worried about status/safety/income | Trust, simple proof, local examples |
| **Counsellor** (Anil) | Skill-centre staff | Quick context on escalated families |
| **Admin** (Ms. Rao) | State/district skilling mission officer | Where is resistance, and why |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Parent sentiment shift per session | +0.3 average | End sentiment minus start sentiment |
| Objection resolution rate | 60%+ | Parent expresses acceptance after data shown |
| Answer accuracy | 100% | Every cited number matches the database (tested on 30 questions) |
| Task completion (low-literacy users) | 8 of 10 | Reach Family Summary Card unaided |
| Bot response time (p95) | < 6 seconds | Server-side measurement |

---

## Functional Requirements

### A. Onboarding and Profile
- **FR-A1**: Language selection with voice prompt
- **FR-A2**: State, district, role, class, income bracket, interests (icon picker)
- **FR-A3**: Plain-language consent screen (voice-read)

### B. Joint Conversational Counselling
- **FR-B1**: Chat with text and voice input; voice output toggle
- **FR-B2**: Speaker toggle (Learner / Parent) with message tagging
- **FR-B3**: Quick-tap objection chips for parents
- **FR-B4**: Source badges on every factual number
- **FR-B5**: Missing data disclosure + escalation offer

### C. Verified Outcome Data
- **FR-C1**: Trade pages with placement rate, salary, by district/state
- **FR-C2**: Provider list with accreditation, distance, outcomes
- **FR-C3**: Pathway ladder (NSQF progression, lateral entry)
- **FR-C4**: Scheme and scholarship lookup

### D. Explainer and Family Summary Card
- **FR-D1**: Low-jargon explainer for every trade
- **FR-D2**: Shareable card (image/PDF + WhatsApp)

### E. Human Escalation
- **FR-E1**: "Talk to a counsellor" on every screen
- **FR-E2**: Auto-escalation triggers
- **FR-E3**: Counsellor console with queue, transcript, live chat
- **FR-E4**: Callback request fallback

### F. Sentiment and Engagement Tracking
- **FR-F1**: Per-message objection and sentiment classification
- **FR-F2**: Per-session sentiment shift
- **FR-F3**: Engagement events

### G. Admin Dashboard
- **FR-G1**: District heatmap of resistance index
- **FR-G2**: Objection breakdown by district/trade/language
- **FR-G3**: Sentiment shift trend
- **FR-G4**: Funnel and escalation stats
- **FR-G5**: AI-generated insights
- **FR-G6**: CSV export; role-based access

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page load (3G) | < 3 seconds |
| Device support | Low-end Android (2 GB RAM) |
| Accessibility | WCAG-aligned, 48px targets |
| Reading level | Class 5 |
| Data minimisation | No Aadhaar, district-level only |
| Bot response p95 | < 6 seconds |
| Number accuracy | 100% tool-grounded |
