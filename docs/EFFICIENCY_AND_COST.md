# Efficiency, Bundle Size & Cost Analysis

**Subject**: Empirical Build Measurements, Token Economics with Reasoning Overhead, and Latency SLAs  
**System**: Parivar Path v17  
**Build Tool**: Next.js 14.2.35 (Standalone Output)  

---

## 1. Measured Client Bundle Sizes (Next.js Production Build)

The metrics below are **directly measured** from `next build` executed in `apps/web`:

### Shared Baseline
- **First Load JS shared by all pages**: **87.3 kB**
  - Chunks: React 18 runtime, Zustand, Lucide icons (tree-shaken), UI primitives
- **Middleware**: **82.5 kB**

### Per-Route Sizing & First Load JS

| Route | Route Chunk Size | First Load JS (Total Download) | Notes |
|---|---|---|---|
| `/` (Language Selector) | 3.06 kB | 102 kB | Minimal landing gate |
| `/consent` (Data Consent) | 2.50 kB | 102 kB | Privacy terms & consent toggles |
| `/profile` (Family Context) | 3.58 kB | 103 kB | Dynamic profile & district selection |
| `/joint` (Joint Alignment) | 4.83 kB | 104 kB | Dual-speaker parent/learner perspective form |
| `/trades` (Pathway Catalog) | 3.32 kB | 178 kB | Filterable trade cards & curriculum list |
| `/trades/[id]` (Trade Detail) | 4.77 kB | 183 kB | Detailed wage ladders & eligibility criteria |
| `/chat` (Guidance Dialogue) | 7.71 kB | 186 kB | Streaming assistant, voice input, speech synthesis |
| `/summary` (Joint Report) | 5.12 kB | 184 kB | Comparative summary & escalation options |
| `/counsellor` (Staff Portal) | 2.13 kB | 159 kB | Counsellor authentication gateway |
| `/counsellor/dashboard` | 3.73 kB | 166 kB | Escalation queue, SLA trackers, contact resolution |
| `/admin` (Analytics Gateway) | 2.12 kB | 159 kB | Administrator authentication gateway |
| `/admin/dashboard` | 3.17 kB | 166 kB | District resistance heatmaps, funnel statistics |
| `/research` (User Feedback) | 3.02 kB | 90.3 kB | Static observation guide & survey capture |

> [!NOTE]
> All client routes remain under 200 kB First Load JS, ensuring responsive load times over rural 3G/4G cellular connections in Telangana districts.

---

## 2. Gemini Token Economics & Cost Model

### Pricing Benchmark (Google Gemini Developer API Standard Tiers)
*Reference: Google Cloud AI / Google AI Studio Published Pricing*
- **Gemini 2.5 Flash / 3.x Flash Preview**:
  - **Input Tokens**: $0.10 per 1,000,000 tokens (prompts $\le$ 128k)
  - **Output Tokens**: $0.40 per 1,000,000 tokens
- *Note on Reasoning Tokens*: For Gemini models with `thinking_config` enabled (`thinking_level: low`), internal reasoning/thinking tokens are **metered and billed as output tokens**.

### Per-Turn Token Breakdown (Realistic Operating Model)
- **Input Context**: ~750 tokens
  - System instruction & bilingual glossary rules: ~400 tokens
  - Verified outcome table injection (schema & local records): ~300 tokens
  - User message: ~50 tokens
- **Output Generation**:
  - Visible assistant response: ~130 tokens
  - Model thinking / reasoning tokens: ~220 tokens
  - **Total Billed Output per Turn**: ~350 tokens (capped at `max_output_tokens: 1024`)

### Cost Per Family Session (Average 6 Turns)
- **Input Tokens per Session**: $6 \times 750 = 4,500\text{ tokens}$
- **Output Tokens per Session**: $6 \times 350 = 2,100\text{ tokens}$

$$\text{Input Cost} = \frac{4,500}{1,000,000} \times \$0.10 = \$0.000450$$
$$\text{Output Cost} = \frac{2,100}{1,000,000} \times \$0.40 = \$0.000840$$
$$\mathbf{\text{Total Cost per Family Session}} = \mathbf{\$0.001290 \ (\approx ₹0.11\text{ INR})}$$

### Projected Monthly Infrastructure Costs

| Monthly Family Sessions | Input Tokens | Output Tokens | Total Cost (USD) | Total Cost (INR @ ₹85/\$) |
|---|---|---|---|---|
| **1,000 sessions** | 4.5M | 2.1M | **$1.29** | **~₹110** |
| **5,000 sessions** | 22.5M | 10.5M | **$6.45** | **~₹548** |
| **25,000 sessions** | 112.5M | 52.5M | **$32.25** | **~₹2,741** |
| **100,000 sessions** | 450M | 210M | **$129.00** | **~₹10,965** |

> [!TIP]
> Grounded numeric validation (`validateGeneratedNumbers`) checks that every numerical claim (salary, placement %, sample size) matches verified DB records or fallback schema. This prevents circular clarification loops and keeps session length bounded.

---

## 3. Latency & Core Web Vitals Targets

The following are **target Service Level Objectives (SLOs)** for production deployment:

- **TTFB (Time to First Byte)**: Target $< 200\text{ ms}$ (Edge SSR / API CDN)
- **FCP (First Contentful Paint)**: Target $< 1.0\text{ s}$
- **LCP (Largest Contentful Paint)**: Target $< 1.8\text{ s}$
- **Cumulative Layout Shift (CLS)**: Target $< 0.05$
- **Gemini Assistant Turn Latency (Target SLOs)**:
  - **P50 Expected**: $\approx 1,200\text{ ms}$ (including thinking & tool follow-up)
  - **P90 Expected**: $\approx 2,200\text{ ms}$
  - **Circuit Breaker / Fallback Timeout**: $10,000\text{ ms}$ before automatic fallback to secondary model or deterministic localized templates.
