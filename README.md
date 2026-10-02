# 🏠 Parivar Path — पारिवार पथ

> AI-Enabled Family Career Counselling Platform for Vocational Education

[![SIH 2024](https://img.shields.io/badge/SIH-26241-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## 🎯 Problem

Vocational enrolment in India is shaped by **family perception** more than access. Parents often veto vocational paths due to concerns about status, income, and safety. Existing career-guidance tools only serve the learner — **parents are unserved**.

## 💡 Solution

**Parivar Path** is a multilingual, voice-first AI counsellor that:
- Talks to the **learner and parents together**
- Answers parental objections with **verified local outcome data**
- Shows a **career progression pathway** (not a dead end)
- Escalates to **human counsellors** when needed
- Gives administrators **actionable visibility** on resistance patterns

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Family PWA (React/Next.js)         │
│   Onboarding │ Chat │ Trade Pages │ Summary Card    │
├─────────────────────────────────────────────────────┤
│              Counsellor Console │ Admin Dashboard    │
└──────────────────────┬──────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  FastAPI Backend                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           Counselling Orchestrator            │   │
│  │  System Prompt │ Tool Calling │ Validator     │   │
│  └──────────┬───────────────────────────────────┘   │
│  ┌──────────▼───────────────────────────────────┐   │
│  │  Tool Layer: outcomes, pathways, providers,   │   │
│  │  schemes, stories, trades                     │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  Classifier │ Escalation │ Insights Generator │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   PostgreSQL       Redis          Claude API
   (data store)   (sessions,      (LLM backbone)
                   queue)
```

## 📁 Project Structure

```
parivar-path/
├── apps/
│   └── web/                # Next.js 14 PWA
│       ├── src/
│       │   ├── app/        # App Router pages
│       │   ├── components/ # Reusable components
│       │   ├── lib/        # Utilities, API client, i18n
│       │   └── locales/    # i18n JSON files (en, hi, te)
│       └── public/         # Static assets, manifest
├── services/
│   └── api/                # FastAPI backend
│       ├── app/
│       │   ├── routers/    # API endpoints
│       │   ├── core/       # Orchestrator, tools, prompts, validator
│       │   ├── models/     # SQLAlchemy models
│       │   ├── schemas/    # Pydantic schemas
│       │   └── seed/       # CSV data + seed loader
│       └── Dockerfile
├── infra/
│   └── docker-compose.yml  # PostgreSQL, Redis, API, Web
└── docs/                   # Architecture, PRD, accessibility
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### 1. Clone and Start

```bash
cd parivar-path/infra
docker-compose up -d
```

### 2. Seed the Database

```bash
cd services/api
python -m app.seed.seed_loader
```

### 3. Access

| Service | URL |
|---------|-----|
| Family PWA | http://localhost:3000 |
| API Docs | http://localhost:8000/docs |
| Admin Dashboard | http://localhost:3000/admin |
| Counsellor Console | http://localhost:3000/counsellor |

### Default Credentials
- **Admin**: admin@parivarpath.in / demo123
- **Counsellor**: counsellor1@parivarpath.in / demo123

## 🔑 Key Features

### For Families
- 🗣️ **Voice-first** — speak in your language, no typing needed
- 👨‍👩‍👦 **Joint counselling** — learner and parent speak to the same AI
- 📊 **Verified data** — every number comes from the database, not AI imagination
- 🏘️ **Local context** — salary and placement data for your district
- 📱 **Share** — WhatsApp the Family Summary Card to relatives

### For Counsellors
- 📋 **Auto-summary** — see the family's concerns before you start
- 💬 **Live chat** — pick up where the AI left off
- 📝 **Notes** — document resolution for follow-up

### For Administrators
- 🗺️ **Resistance heatmap** — see where families resist, district by district
- 📈 **Sentiment tracking** — measure if counselling changes minds
- 🔍 **AI insights** — automated analysis of resistance patterns
- 📥 **CSV export** — for further analysis

## 📊 Resistance Index Formula

```
resistance_index(district) =
    0.5 × share_of_parent_sessions_with_negative_start_sentiment
  + 0.3 × escalation_rate
  + 0.2 × (1 − mean_sentiment_shift_normalised)

Normalised to 0–100
```

## 🛡️ AI Safety

- **Tool-grounded answers**: Every number must come from a database query
- **Number validator**: Checks all figures in AI responses against tool results
- **Escalation triggers**: Auto-detects when human help is needed
- **No hallucinated statistics**: Missing data = honest "I don't know" + escalation
- **Prompt injection guard**: User text never treated as system instructions

## 🌐 Supported Languages

- English 🇬🇧
- Hindi 🇮🇳 (हिन्दी)
- Telugu 🇮🇳 (తెలుగు)

## ♿ Accessibility

- Min 48px tap targets
- High contrast, large fonts
- Voice input/output on every screen
- Class 5 reading level
- Icons + short labels
- One action per screen
- No typing required for main flow

## 📄 License

MIT — Built for SIH 2024, Problem Statement #26241
