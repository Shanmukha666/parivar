# Parivar Path: the road to 100/100

Everything here is based on the audit of `Shanmukha666/parivar` plus a Supabase migration that was built and tested in a sandbox.

## What is verified and what is not

| Item | Status |
|---|---|
| `supabase/migrations/…_parivar_core.sql` | Applied cleanly to real PostgreSQL 16 |
| RLS and privilege rules | **52 of 52** automated checks pass (`supabase/tests/rls_test.py`) |
| `services/api/app/core/supabase_auth.py` JWT verifier | **23 of 23** checks pass, including forged-role, `alg=none` and HS256-confusion attacks |
| Supabase dashboard settings, supabase-js and supabase-py snippets in this doc | **Not run** against a live project. Treat them as a checklist and verify |
| Official SIH 2026 judging rubric | I have not seen it. The criteria below are the usual ones for this kind of hackathon, so check them against the PS brief |

One real bug was found by testing and fixed before shipping: policies on `sessions` and `escalations` referenced each other, which makes Postgres fail with "infinite recursion detected in policy". The fix is the `SECURITY DEFINER` helper functions in section 5d of the migration.

---

## 1. Scorecard: now and target

| Category | Audit score | Target | The thing that moves it |
|---|---|---|---|
| Security | 2 | 9 | Supabase Auth + RLS, remove `demo123`, no default secrets, rate limits, CAPTCHA |
| Backend correctness | 5 | 9 | `selected_trade_id` wired, tools used by the LLM, validator and placeholders |
| Data and DB design | 6 | 9 | Constraints, indexes, FK on district, audit trail, real aggregates |
| Frontend UI/UX | 6 | 9 | Fix `speak` import, no hardcoded numbers, full i18n, real consent |
| Accessibility / low-literacy | 4 | 9 | Real ARIA, 16px floor, voice everywhere, a tested evidence pack |
| AI quality and safety | 5 | 9 | Eval set, server-rendered numbers, injection defences |
| PS alignment | 6 | 10 | All 5 expected outcomes demonstrable live |
| Efficiency | 4 | 8 | Parallel classify, Haiku, caching, SQL aggregates |
| Reliability / DevOps | 3 | 8 | Prod Dockerfiles, health checks, CI, backups |
| Testing | 3 | 9 | Auth, RLS, eval, one end-to-end test |
| Privacy / compliance | 3 | 9 | Consent, minors, delete-my-data, retention, phone masking |
| Demo and pitch | n/a | 10 | Scripted 3-minute story with evidence on screen |

Honest note: nobody can promise a win. What you can control is that nothing a judge clicks is broken, fake or insecure, and that every claim has evidence.

---

## 2. Target architecture

```
Browser (Next.js PWA)
  | 1. supabase.auth.signInAnonymously()        (families)
  | 2. email + password + TOTP MFA               (counsellors, admins)
  v
Supabase
  Auth ........ anonymous users, staff accounts, JWT signing keys (ES256)
  Postgres .... schema + RLS (this migration) + admin RPCs
  Realtime .... counsellor queue + live chat (RLS enforced)
  pg_cron ..... retention
  ^
  | reads/writes with the USER'S JWT  -> RLS applies
  | AI-only writes with the secret key -> server side only
  |
FastAPI (orchestrator only)
  verify JWT (JWKS) -> classify -> tools -> LLM -> number-validate -> save
```

**Keep FastAPI for the AI path.** It holds the LLM key, the classifier, the tool layer and the number validator, and none of that belongs in the browser. Supabase replaces the custom auth, the SQLAlchemy models, the custom WebSocket and the hand-written admin SQL.

**Rule of thumb:**

| Operation | Who does it | Key used |
|---|---|---|
| Read trades, outcomes, providers | Browser directly | publishable key, RLS |
| Create session, choose trade, request a call | Browser directly | the user's JWT, RLS |
| AI chat turn | FastAPI | user's JWT to verify, secret key to write AI rows |
| Counsellor queue, accept, live chat | Browser directly | staff JWT, RLS + Realtime |
| Admin dashboard | Browser calls the 3 `admin_*` RPCs | admin JWT |

---

## 3. Supabase setup runbook

1. **Create the project.** Choose the region closest to your users (Mumbai if available), and enable MFA on your own Supabase account.
2. **Apply the migration.** Run `supabase db push`, or paste the SQL into the SQL editor.
3. **Seed reference data.** Import the CSVs for `districts`, `trades`, `providers`, `outcomes`, `pathways`, `schemes` and `stories`. Seed `districts` first, because `providers` and `sessions` reference it. Keep `is_synthetic = true` until MSDE-verified rows arrive.
4. **Auth settings (dashboard).**
   - Enable **Anonymous sign-ins** and turn on **CAPTCHA** (Cloudflare Turnstile). Supabase recommends CAPTCHA for anonymous sign-ins.
   - **Raise the anonymous sign-in rate limit.** The default is **30 per hour per IP**. At a hackathon or a training centre, many families share one NAT address, so the 31st family would be blocked. Raise it for the event and keep CAPTCHA on.
   - Disable public email sign-up. Staff accounts are invited only.
  - Switch to **JWT signing keys (asymmetric)**. `services/api/app/core/supabase_auth.py` verifies against `/auth/v1/.well-known/jwks.json`.
   - Shorten the access-token lifetime to about 15 minutes for staff if your plan allows it.
5. **Create staff accounts server-side** (service key, never in the browser). Roles go in `app_metadata`, because users can edit `user_metadata` themselves:
   ```js
   await supabaseAdmin.auth.admin.createUser({
     email, password, email_confirm: true,
     app_metadata: { role: 'counsellor' }     // or 'admin'
   })
   ```
   Require TOTP MFA for admins.
6. **Realtime.** The migration adds `escalations` and `messages` to the publication. Check them under Database, Publications.
7. **Keys.** The secret key goes only in the FastAPI environment. The publishable key goes in the frontend. Never use a `NEXT_PUBLIC_` prefix on the secret key.
8. **pg_cron** (optional): enable the extension and uncomment the retention job at the bottom of the migration.
9. **Backups and pausing.** Turn on whatever backup option your plan offers. Free-tier projects can be paused after inactivity, so open the project and run a query the day before judging.
10. **Security advisor.** Run Supabase's built-in security and performance advisors and clear every warning.

### Frontend: family sign-in (not run against a live project)

```ts
// lib/supabase.ts  (use @supabase/ssr in Next.js)
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)

export async function ensureFamilySession(captchaToken: string) {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: s, error } = await supabase.auth.signInAnonymously({ options: { captchaToken } })
  if (error) throw error
  return s.session
}
```

Counsellor queue with Realtime:

```ts
supabase.channel('queue')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, loadQueue)
  .subscribe()
```

### FastAPI: user-scoped reads and AI writes (not run against a live project)

```python
from supabase import create_client
def user_db(token):                      # RLS applies, using the caller's identity
    c = create_client(URL, PUBLISHABLE_KEY); c.postgrest.auth(token); return c
service_db = create_client(URL, SECRET_KEY)   # only for AI rows: messages(speaker='ai') + message_analysis
```

---

## 4. Every audit finding and its fix

| # | Finding in the repo | Severity | Fix in this pack |
|---|---|---|---|
| 1 | `verify_password` returns true for `"demo123"` on any account | Critical | Deleted. Supabase Auth verifies credentials |
| 2 | Default JWT secret committed in 3 places; forged admin token works | Critical | `services/api/app/core/supabase_auth.py` verifies against Supabase JWKS. No shared secret in the repo |
| 3 | `get_current_user` trusts the role claim if the user row is missing | Critical | Role comes from the verified token's `app_metadata` only |
| 4 | `/admin/*`, `/export.csv`, `/counsellor/queue` have no auth | Critical | `admin_user` / `counsellor_user` dependencies, and the `admin_*` RPCs re-check the role inside Postgres |
| 5 | WebSocket open to anyone with a session ID; any client can impersonate a counsellor | High | Replaced by Supabase Realtime with RLS. Counsellor writes need `counsellor_active_on_session` |
| 6 | Counsellor and admin login pages only call `router.push` | High | Real Supabase login + Next.js middleware (below) |
| 7 | `/chat` unauthenticated and silently creates a fallback Warangal session | High | `family_user` required; no fallback session |
| 8 | CORS `*` with credentials | High | Env-driven origin list |
| 9 | No rate limit on LLM endpoint | High | `slowapi` per user and per IP, plus Supabase CAPTCHA |
| 10 | Unvalidated `SessionCreate` | High | Enums, length checks and **FK on (state, district)** in the database. Tested: an XSS district string is rejected |
| 11 | Unescaped HTML in `summary.py` | High | Jinja2 autoescape, or render in the frontend |
| 12 | Consent hardcoded `true` | High | `consents` table, `sessions.consent` check constraint, guardian flag |
| 13 | Phone numbers readable by any caller | High | Separate `escalation_contacts` table, visible only to the accepting counsellor (tested) |
| 14 | Fabricated fallbacks (78% / ₹16,500 with a green "verified" badge) | High (credibility) | Remove. Show "can't verify right now". `NEXT_PUBLIC_DEMO_MODE` shows a visible DEMO ribbon |
| 15 | Admin metrics hardcoded (`0.32` shift, padded funnel, canned insights) | High (credibility) | `admin_kpis` returns `null` until there are 10 real sessions with 4+ parent messages |
| 16 | `selected_trade_id` never set, so tools never feed the model | High (functionality) | Allowed by column grant (`update (selected_trade_id, lang)`); wire the trade page |
| 17 | `speak` import breaks the language screen (`tsc` errors) | High (functionality) | Export `speak` or rename imports |
| 18 | Prompt injection via free-text profile fields | Medium | Enum-only profile fields, user text wrapped in `<user_message>` and treated as data |
| 19 | Number validator allows ₹16,000 against ₹16,500 and skips small numbers | Medium | Placeholder rendering, see section 6 |
| 20 | Classifier false positives ("know", "bad", "gaya") and no Devanagari/Telugu keywords | Medium | Word-boundary regex, script keywords, LLM classifier on Haiku |
| 21 | `next@14.2.3` critical advisory; `next-pwa` chain has 6 high | Medium | Upgrade Next, replace `next-pwa` |
| 22 | Dev-mode Docker images, DB/Redis ports exposed, secrets in compose | Medium | Multi-stage prod images, no published DB ports, `.env` |
| 23 | No indexes besides primary keys | Medium | 15 indexes in the migration |
| 24 | Admin metrics: 3 queries per district, recomputed on 3 endpoints | Medium | Single-pass SQL RPCs |
| 25 | Redis provisioned, never used | Low | Remove, or use it for the rate limiter |
| 26 | Accessibility doc overclaims (2 ARIA attributes in source) | Medium (credibility) | Implement, measure, and cite real reports |

---

## 5. New risks that come with Supabase, and how the pack handles them

| Risk | Handling |
|---|---|
| **RLS recursion** between related tables | Found in testing. `SECURITY DEFINER` helper functions with `set search_path = ''` |
| **Role in `user_metadata`** (user-editable) | Policies read `app_metadata` only. Tested: a forged `user_metadata.role=admin` is ignored |
| **Broad default grants** to `anon`/`authenticated` | Migration section 7 revokes and re-grants. Column-level `UPDATE` grants stop users changing `owner_id`, `status`, `resolved_at` |
| **Admin sees too much** | Admins get aggregates only. Raw messages return 0 rows (tested) |
| **Small-sample re-identification** | k-anonymity: fewer than 10 sessions returns `NULL` |
| **Service key leak** | Server only, never `NEXT_PUBLIC_`. Rotate if it ever appears in a log or commit |
| **Stale role in a still-valid token** | Short staff token lifetime. Revoke sessions when removing a staff member |
| **Anonymous user pile-up** | pg_cron purge of anonymous users older than 90 days, which cascades |
| **Views bypass RLS** | Don't add views, or create them with `security_invoker = true` |
| **Realtime leaking rows** | Realtime respects RLS. Only add tables that have policies |
| **`SECURITY DEFINER` functions callable by anyone** | Execute revoked from `public` and `anon`; role checked inside |
| **Free-tier pause or quota in the demo** | Warm up the day before. Have a screen recording as a backup |

Protect the staff side too. In Next.js `middleware.ts`, redirect any `/admin/*` or `/counsellor/*` request without a session whose `app_metadata.role` matches. The database remains the real enforcement, so middleware is only a UX layer.

---

## 6. Category-by-category plan to the target

### 6.1 Security (target 9)
- All items in section 4. Add security headers in `next.config.js` (`Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`).
- Disable FastAPI `/docs` and `/openapi.json` in production.
- Turn on Dependabot, `npm audit` and `pip-audit` in CI, plus `gitleaks` on every push.
- Rotate every secret that was ever committed (the old `JWT_SECRET`, DB password).
- **Evidence:** a one-page threat model and the RLS test output (52/52) on a slide.

### 6.2 Backend and AI (target 9)
- **Server-rendered numbers.** Make the model write `{placement_rate}` placeholders and substitute them from the database row. A wrong number then becomes impossible, not merely detectable.
- Run the classifier and the tool pre-fetch concurrently with `asyncio.gather`, on a smaller model. Make the model names env-configurable.
- Pass the pre-fetched data into the model call. Today `messages=history` ignores it.
- Implement the `escalate_to_human` tool, which the prompt mentions but isn't in `TOOL_FUNCTIONS`.
- Add timeouts, bounded retries and a clear degraded mode.
- Stream replies (SSE).
- Add prompt caching for the system prompt and tool schemas.
- **Distress handling:** on self-harm or crisis phrases, respond calmly and escalate immediately.

### 6.3 Data (target 9)
- Replace the sample dataset with MSDE's files when provided. Show "verified on <date>" and sample size beside every number, and mark synthetic rows "Example".
- Alembic is replaced by the Supabase migrations folder. Keep every change as a new timestamped file.

### 6.4 Frontend UI/UX (target 9)
- Split layouts: a mobile shell for families, a full-width layout for admin and counsellor.
- Persist the session so a refresh resumes the chat.
- Per-message "Listen" button instead of auto-speaking everything.
- A "Source" drawer showing the exact record behind each number.
- A real consent step in the user's language.
- Remove the prefilled phone number. Validate with `^[6-9]\d{9}$` (the database enforces it too).
- Honest error states everywhere. Never show a number you could not fetch.

### 6.5 Accessibility and low-literacy (target 9)
- Add `aria-label` to icon buttons, `aria-live="polite"` on the chat log, a focus-trapped `role="dialog"` modal and visible focus rings.
- 16px minimum text, with a larger-text toggle. Fix the orange-on-white contrast for small text.
- Noto Sans Devanagari and Telugu via `next/font`. Inter has no glyphs for them.
- Voice on every screen. Add a fallback to Bhashini (Indian-language speech) where the Web Speech API is weak, especially for Telugu.
- **Evidence:** Lighthouse and axe reports saved in `docs/`, and notes from at least 3 real users (a parent if you can). That is the strongest "design for low-literacy users" proof you can show.

### 6.6 Efficiency (target 8)
- Admin: three SQL RPCs instead of N queries. Cache for 60 seconds.
- Defer Recharts and Leaflet with dynamic import, and measure bundle size on a throttled phone profile.
- Target: p95 chat reply (first token) under 3 seconds, admin dashboard under 1 second, first load under 200 KB JS for the family flow. Measure and publish the numbers.

### 6.7 Reliability and DevOps (target 8)
- Production Dockerfiles (`next build && next start`, `uvicorn` without `--reload`, non-root user).
- `/health` and `/ready` endpoints. Structured logs with request IDs. Sentry for errors.
- GitHub Actions: lint, type-check, unit tests, the RLS test against a Postgres service container, `npm audit`, `pip-audit`, `gitleaks`.
- Deploy: Vercel for the frontend, Render/Fly/Railway for FastAPI, Supabase for data.

### 6.7b Testing (target 9)
- Already built: RLS (52) and JWT (23).
- Add: classifier tests, tool-fallback tests (district falls back to state under 20 samples), escalation trigger tests, one Playwright run of the full family-to-counsellor flow, and the AI eval below.

### 6.8 Privacy and compliance (target 9)
- Plain-language consent in each language, with a guardian flag for minors.
- "Delete my data" button (the policy and cascade are in the migration, tested).
- Retention job. Never export phone numbers. Mask the number until a counsellor accepts (done).
- Write a one-page privacy note aligned with the DPDP Act principles (purpose limitation, minimisation, retention). I am not a lawyer, so have someone check it before you claim compliance.

### 6.9 AI evaluation harness (this is a differentiator)
Build 50 to 100 realistic parent objections across English, Hindi and Telugu, and score:

| Metric | Target |
|---|---|
| Objection classification accuracy | at least 85% |
| Invented numbers (not in the record) | **0** |
| Correct escalation on distress or "talk to a person" | 100% |
| Reply in the family's language | at least 95% |
| Tone rated acceptable by a native speaker | at least 90% |

Publish the table. Almost no team will have one.

---

## 7. Problem-statement alignment (SIH26241)

| Expected outcome | Live proof for the demo |
|---|---|
| Conversational tool for learners and parents in English plus a regional language | Switch EN, Hindi, Telugu mid-demo, with voice in and out |
| Verified outcome-data backend | Open the "Source" drawer: record, year, sample size, verified date. Show a question with no data and the honest "I don't have verified data" reply |
| Admin dashboard: where **and why** | District resistance index, objection breakdown per district, sentiment shift, with k-anonymity noted |
| Evidence of low-literacy design | Lighthouse and axe scores, voice mode, icon-first screens, real user notes |
| Human escalation path | Family taps "talk to a person", the counsellor desk updates in real time, phone number appears only after accept, then "family changed its mind" is recorded |

**Differentiators the PS hints at but most teams will skip**
1. **Joint mode ("pass the phone").** Learner and parent each answer 3 icon questions and the summary shows where they disagree. This is the "family unit" idea in the brief.
2. **Measured impact.** Sentiment shift per session and the counsellor's `family_changed_mind` flag give you a real before-and-after metric.
3. **WhatsApp or IVR channel** using the same orchestrator, for families without data.
4. **Offline-tolerant PWA** with cached trade data and a queued message outbox. Only claim "offline" once this exists.

---

## 8. Demo and pitch

**3-minute demo script**
1. (20s) The problem: a parent says "log kya kahenge" and the learner drops out.
2. (60s) Family flow in Hindi with voice: income, then safety, with the Source drawer open.
3. (30s) Parent still unsure, taps "talk to a person".
4. (40s) Counsellor desk: ticket appears live, phone hidden, accept, number appears, resolve with "changed mind".
5. (30s) Admin dashboard: the district hotspot and why (objection mix), real sentiment shift.
6. (20s) Evidence slide: RLS 52/52, JWT 23/23, AI eval table, Lighthouse score.

**Questions to rehearse**
- How do you stop the AI inventing salaries? (Placeholders filled by the server, validator, eval shows 0 invented numbers.)
- Who can see a family's data? (RLS: the family, the counsellor on that ticket, nobody else; admins see only aggregates.)
- What if a parent is distressed? (Immediate escalation.)
- What about families with no smartphone? (WhatsApp/IVR path.)
- How does it scale? (Supabase Postgres, stateless FastAPI, cached aggregates.)
- Is the data real? (Be honest: sample data, schema ready for MSDE-verified rows, flagged by `is_synthetic`.)

**Pitch deck outline:** problem, who decides (the family), solution, live flow, architecture and trust (RLS, validator), impact metrics, evidence pack, roadmap.

---

## 9. Time plan

The idea submission closes on 5 October 2026, so split the work.

| Window | Do |
|---|---|
| **Before 5 Oct** | Idea PPT and architecture slide. Apply the migration and show the 52/52 result as proof of engineering depth |
| **Next** | Wire Supabase Auth + anonymous sign-in. Delete `demo123`, the default secret and all fabricated fallbacks. Fix the `speak` import and `selected_trade_id`. Real login pages and middleware |
| **Then** | Number placeholders, concurrent classify, Haiku, streaming. Full i18n and fonts. Accessibility fixes. Admin RPCs wired |
| **Then** | Eval harness, Playwright test, CI, production Docker. Lighthouse and axe reports. User notes |
| **Last** | Joint mode, WhatsApp or IVR if time allows. Demo rehearsal, backup screen recording, warm the Supabase project |

Do not add features in the final day. Cut risky ones and keep the story airtight.

---

## 10. Definition of done (the "100/100" checklist)

**Security**
- [ ] No `demo123`, no default secret, no secret in git history (rotated)
- [ ] All staff routes need a verified staff JWT; admin MFA on
- [ ] RLS test suite passes in CI
- [ ] CORS allowlist, rate limits, CAPTCHA, security headers
- [ ] `npm audit` and `pip-audit` clean of high and critical

**Truthfulness**
- [ ] No hardcoded numbers in the frontend or admin API
- [ ] Every number shows source, year and sample size
- [ ] `is_synthetic` rows are labelled "Example"
- [ ] AI eval: 0 invented numbers

**Function**
- [ ] `tsc` clean, build passes, language screen works
- [ ] Trade selection reaches the orchestrator and the tools feed the answer
- [ ] Escalation works end to end in real time
- [ ] Admin metrics come from real sessions

**Experience**
- [ ] EN, Hindi, Telugu complete, with correct fonts
- [ ] Voice in and out; icon-first screens; 16px minimum
- [ ] Lighthouse accessibility at least 90 and axe: 0 critical
- [ ] Real consent flow and "delete my data"

**Proof**
- [ ] Eval table, test reports, accessibility reports and user-test notes in `docs/`
- [ ] 3-minute demo rehearsed, with a recorded backup
