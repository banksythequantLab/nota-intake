# Nota Intake — submission texts

## 1. Pull request → CALLE-AI/awesome-phone-call-agents

Branch: `banksythequantLab:feat/nota-intake-app` → `main`
Title: `feat(apps): add nota-intake web app`

Body:

---
**Nota Intake — law-firm client intake by phone** (`apps/web/nota-intake`)

A prospective client picks a topic on a three-step form — real estate, will, trust, lawsuit, or something else — and leaves a name and number. Within a minute CALL-E calls them back and runs *that topic's* interview in the language their number supports, returning a record an intake paralegal can act on. A staff console places intake and reminder calls from the desk, follows them live, and syncs outcomes.

**CALL-E at runtime**
- `POST /v1/calls` per intake, with a task and a `recipient_result_schema` planned per matter type (common fields + type fields: e.g. a lawsuit returns `side`, `court_papers_received`, `papers_deadline`, `court_or_county`)
- `webhook_url` → `/api/calle-webhook`, then `GET /v1/calls/{id}` for authoritative state, transcript turns, confidence and evidence
- `Idempotency-Key` per intake and per reminder
- Reminder calls with their own `REMINDER_SCHEMA` (`confirmed`, `reschedule_request`), outcomes synced back to the record

**Verified with real calls (Sept 4–5, 2026)**
- US (+1) numbers: English and Bahasa Indonesia interviews both completed
- US numbers reject Spanish via REST `locale`, via Spanish task text with `locale: en-US`, and via MCP `plan_call --language Spanish` (planner offers "English or Bahasa for US") — documented in the README as a per-line capability, not a validation gap; the Spanish script is wired and waits on one row in `regions.json`
- Language is locked per call: the bot offered to switch to English mid-call and could not

**Live**: https://nota-intake.pages.dev (form) · `/review` (staff console, token)
**Repo**: https://github.com/banksythequantLab/nota-intake
**Demo video (≤3 min)**: VIDEO_URL
**CALL-E account email**: dj@soltis.info

Stack: Cloudflare Pages + Functions + KV, no framework, no build step. MIT.
---

## 2. Devpost submission form

**Project name:** Nota Intake

**Tagline (≤ 60 chars):** The form is three steps. The phone call is the intake.

**Contribution area:** Apps (`apps/web/nota-intake`)

**PR URL:** (filled in after the PR opens)

**Demo video:** VIDEO_URL

**CALL-E account email:** dj@soltis.info

**Functional demo URL:** https://nota-intake.pages.dev

**Description:**

Small law firms lose clients in the intake form. Older clients, people on a phone at work, anyone reading in a second language — they don't finish it. Nota Intake makes the form three steps and lets the phone do the intake.

The client picks a topic (real estate, will, trust, lawsuit, or something else), leaves a name and number, and CALL-E calls them back within a minute. The topic plans the call: each type has its own questions and its own `recipient_result_schema` on top of the common intake (summary, other parties for the conflict check, urgency, deadline, best time, email confirmed letter by letter, consent). A lawsuit intake learns which side they're on, whether court papers arrived and the deadline printed on them; a will intake learns about family, an existing will and an executor; real estate gets the property, their role and a closing date; a trust gets its purpose and beneficiaries by relationship only. The assistant states on every call that this is intake, not legal advice, and that no attorney-client relationship exists until an attorney confirms in writing. It never quotes fees, never asks about health or asset values.

A token-gated staff console lets the firm call a client from the desk (walk-ins, voicemails), watch the call land, filter records by topic and status, search by name or other party, and place a consultation reminder call from a date picker — the reminder's outcome (confirmed, can't make it, reschedule request) syncs back onto the record.

Everything runs on Cloudflare Pages, Functions and KV; every intake and reminder is a real `POST /v1/calls` with a webhook and an idempotency key. Scripts exist in English, Spanish and Bahasa Indonesia. Tested with real calls on a US number: English and Bahasa interviews completed; Spanish is not carried on US lines today (tested via REST locale, task text and the MCP planner — all declined before dialing), which the README documents rather than hides. When CALL-E enables it, the change is one row in a JSON file.

**Built with:** CALL-E API (`/v1/calls`, webhooks, result schemas), Cloudflare Pages, Cloudflare Functions, Cloudflare KV, JavaScript, Google Fonts

**What's next:** Spanish (and French) interviews the day CALL-E carries them on US lines; SMS confirmations once the firm's A2P registration clears; calendar booking from the console.

## 3. Feedback survey (the $200 "Most Valuable Feedback" line)

Spanish on US (+1) lines: tested three ways on Sept 4–5 — REST `locale: "es"` (also `es-US`, `es-MX`, and `region: "MX"` with a +1 number), Spanish task text with `locale: "en-US"`, and MCP `plan_call --language Spanish --region US`. All three decline before dialing; the planner offers "English for US" or "Bahasa for US". Bahasa (`locale: "id"`) completed a real call on the same number. Two requests: publish a per-region locale table with the exact codes the API accepts (the README's language names had to be guessed into codes), and put Spanish on the US line — for US legal, medical and social-services intake it is the single biggest case for phone over web forms. Also useful: a `recording_url` on completed calls (transcript turns are excellent; audio would let demos be honest without synthetic voices), and a documented webhook payload shape.

## 4. Reply to Ray-56's superseding review on PR #393 (post as a PR comment)

Thanks for the bounded list — both items are addressed in b19c218.

**Authorization / recipients / origins**
- `POST /api/intake` (places the call): browser `Origin` must be the app's own origin or `ALLOWED_ORIGINS`; `source: "staff"` additionally requires the `x-review-token` header; optional `INTAKE_ACCESS_CODE`; 3 submissions/IP/hour and a `MAX_CALLS_PER_DAY` cap. (`functions/api/intake.js`, `functions/_lib.js`)
- `POST /api/remind`: token header + Origin; dials only the number already on the stored record. (`functions/api/remind.js`)
- `GET /api/intakes`: token header only, constant-time compare; query-string tokens rejected. (`functions/api/intakes.js`)
- Recipient policy on every dial: strict E.164, emergency/short-code prefixes blocked, `ALLOWED_RECIPIENTS` allowlist. Credentials exist only as Pages secrets and are used server-to-server.

**Webhook / masking / language**
- `/api/calle-webhook` fails closed without `WEBHOOK_SECRET`, compares in constant time, and stores only `{call_id, received_at}`; state is re-fetched from CALL-E with the API key. (`functions/api/calle-webhook.js`)
- Console output is redacted: phone masked to country code + last four, provider evidence dropped. (`redactRecord` in `_lib.js`)
- `validate_repository.py` now passes: the region picker used native-script language names (`中文`, `日本語`, …) — all are English now. The Spanish/Indonesian interview scripts and form strings are the app's localization content (what the bot says to a Spanish-speaking client); they're isolated in `functions/locales/{en,es,id}.js` and `public/i18n.json` as data, with all code, comments, README and docs in English.

README has a new "Authorization and safety" section covering the above plus cancellation.

## 5. Pre-demo checklist (run on vesper from D:\nota-intake)

1. Remove the stray test record placed 2026-09-11 during deploy propagation (call already failed; +1 917 555 0100 is a reserved number):
   ```
   npx wrangler kv key delete --namespace-id 11862678fb264e8994d79f4c01c67851 intake_5f78a951-4db3-48c3-ad6d-0cb7cda6fea4
   npx wrangler kv key delete --namespace-id 11862678fb264e8994d79f4c01c67851 bycall:call_OyuujO2KYKefZ5nEkKNoDA
   ```
2. Lock dialing to your own number for the demo deployment (paste your E.164 cell when prompted):
   ```
   npx wrangler pages secret put ALLOWED_RECIPIENTS --project-name nota-intake
   ```
   Remove it after judging with `npx wrangler pages secret delete ALLOWED_RECIPIENTS --project-name nota-intake`.
3. Optional: `INTAKE_ACCESS_CODE` the same way, then share the form as `https://nota-intake.pages.dev/?code=<value>` so only judges can trigger calls.
4. Sanity check after any secret change: submit the form once from your phone number; the review console should show the record within a minute.
