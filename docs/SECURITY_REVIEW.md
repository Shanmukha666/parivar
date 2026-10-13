# Security Architecture & Database Hardening Review

**Audit Subject**: `supabase/migrations/20261004000100_security_hardening.sql` (556 lines)  
**Security Status**: Implemented; automated tests exist but require a local Postgres on port 5433  
**Threat Model Scope**: Smart India Hackathon PS #26241 (Multilingual Family Joint Vocational Guidance)

---

## 1. Executive Summary

The database hardening migration establishes defense-in-depth across eight distinct security pillars, preventing privilege escalation, credential forging, queue tampering, and data exfiltration. The architectural mechanisms described below are fully coded into the migration SQL. Automated verification scripts exist in `supabase/tests/rls_test.py` and require a local PostgreSQL instance running on port 5433 to execute against actual database roles. Dedicated application-layer security tests run independently in the pytest suite.

---

## 2. Walkthrough by Section

### Section 0 & 1: Security Definer Isolation & Search Path Hardening (Lines 21–98)
* **Vulnerability Mitigated**: Search path hijacking / schema substitution attacks.
* **Mechanism**: Every helper function (`app.owns_session`, `app.counsellor_may_claim`, `public.is_staff`) explicitly specifies `SET search_path = ''`. Definer functions cannot resolve table names through user-controlled search paths.
* **Non-Recursive Policies**: Ownership checks are isolated into dedicated boolean helper functions, preventing infinite recursion between `sessions` $\leftrightarrow$ `escalations` $\leftrightarrow$ `messages`.

### Section 2: Strict Table Constraints & Defaults (Lines 100–120)
* **Default Synthetic Protection**: `outcomes` and `schemes` default `is_synthetic = true`. Any imported or unreviewed record is treated as unverified/synthetic by default until certified by an administrator.
* **Logical Salary Order**: Check constraint `salary_3yr_min <= salary_3yr_max` prevents inverted or nonsensical wage records.
* **Event Metadata Bounds**: `pg_column_size(metadata) <= 2048` prevents denial-of-service via oversized JSON blobs.

### Section 3: Performance & Unique Ticket Indexing (Lines 122–134)
* **Index Coverage**: High-frequency predicates (`owner_id`, `district`, `counsellor_id`) are indexed to ensure RLS queries execute in sub-millisecond time.
* **Duplicate Ticket Suppression**: Partial unique index `escalations_one_open_per_session` strictly enforces maximum one active ticket (`new`, `assigned`, `contacted`) per family session, preventing queue flooding.

### Section 4: Deterministic State Machine Triggers (Lines 136–254)
* **Status Guard**: Enforces the deterministic transition graph:
  $$\text{new} \longrightarrow \text{assigned} \longrightarrow \text{contacted} \longrightarrow \text{resolved}$$
  Families cannot mark their own tickets as resolved, and unassigned counsellors cannot transition tickets.
* **Audit Trail**: Every escalation insert and status update is immutably appended to `public.audit_log`.
* **Database Quotas**:
  - `app.message_quota`: Maximum 100 messages/day per authenticated family.
  - `app.session_quota`: Maximum 5 sessions/day per authenticated family.
  Protects against token exhaustion and serverless compute abuse.

### Section 5: Fine-Grained Row Level Security (Lines 256–333)
* **Session Ownership**: Families can only read and mutate their own sessions (`owner_id = auth.uid()`).
* **Masked Phone Access**: `escalation_contacts` is restricted so that only the assigned counsellor who has accepted the ticket can view the raw phone number, and only while the ticket remains active.
* **Admin Privacy Guarantee**: Administrators have access to aggregated analytical views and KPI RPCs, but cannot view raw family transcript conversations.

### Section 6: Least-Privilege Role Grants (Lines 335–353)
* Direct table mutation (`INSERT`, `UPDATE`, `DELETE`) on core catalogs (`trades`, `outcomes`, `providers`, `schemes`) is revoked from `authenticated` and `anon`.
* Only `service_role` and administrative migrations can modify trade curricula and placement metrics.

### Section 7: Atomic Server-Side RPCs (Lines 355–428)
* `create_escalation`: Atomically validates 10-digit Indian mobile regex (`^[6-9][0-9]{9}$`), phone consent, and session ownership before issuing a ticket.
* `raise_distress`: High-priority safety path for distress signals. Bumps SLA to 1 hour and sets priority to `urgent` without duplicating tickets.

### Section 8: Privacy-Preserving Analytical Aggregates (Lines 430–556)
* **Differential Privacy / Small Sample Suppression**: All analytical views (`admin_kpis`, `admin_district_resistance`, `admin_objection_breakdown`) suppress metrics when $N < 10$ sessions to prevent de-anonymization of rural participants.

---

## 3. Test Coverage & Verification Status
The application-layer safeguards (PII scrubbing, phone regex, state machine logic, rate limiting, and RBAC guards) are validated in `services/api/tests/test_security_redteam.py`:
- `test_pii_redaction_masks_indian_phone_numbers`
- `test_rate_limiter_blocks_excessive_requests`
- `test_ticket_cannot_be_resolved_without_contact`
- `test_ticket_resolution_succeeds_when_contacted`
- `test_unassigned_counsellor_cannot_contact_or_resolve_ticket`
- `test_require_role_denies_unauthorized_roles`
- `test_escalation_schema_rejects_invalid_phone`

The database-level RLS policies and DB trigger quotas are tested in `supabase/tests/rls_test.py`, which requires a local PostgreSQL service running on port 5433 with the Supabase schema applied.

