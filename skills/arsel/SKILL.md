---
name: arsel
description: Use when writing server-side code against the Arsel API (api.arsel.sa) — sending transactional email, SMS, WhatsApp or push; sending product events that trigger automations or count as conversions; managing contacts, lists, tags and segments; launching campaigns; or handling Arsel errors, rate limits and retries. Use it whenever the user mentions Arsel, a `be_` API key, or api.arsel.sa, even for a "simple" send — the API has gotchas (required `from_name`, idempotency keys, events that must be defined before they are sent, 202 meaning queued, per-item batch results) that silently break integrations.
license: MIT
metadata:
  author: Arsel
  version: "0.1.0"
  homepage: https://docs.arsel.sa
  source: https://github.com/Arsel-SA/arsel-skills
inputs:
  - name: ARSEL_API_KEY
    description: Secret `be_` API key, server-side only. Dashboard → Integration → API Keys.
    required: true
references:
  - references/email.md
  - references/sms.md
  - references/whatsapp.md
  - references/push.md
  - references/events.md
  - references/contacts.md
---

# Arsel API

Arsel is a marketing engagement platform: email, SMS, WhatsApp and push, an audience of contacts,
and product events that trigger automations. This skill is for **server-side** code. For code that
runs in a browser or a mobile app, use the `arsel-sdk` skill instead — that code must never hold a
`be_` key.

There is no official server SDK. Call the REST API directly with your platform's HTTP client.

## Basics every call shares

| | |
|---|---|
| Base URL | `https://api.arsel.sa/v1` |
| Auth | `Authorization: Bearer $ARSEL_API_KEY` — a secret `be_…` key |
| Body | JSON, `Content-Type: application/json` |
| Errors | `{ "status_code": 422, "name": "validation_error", "message": "…" }` |
| Full docs | Every page at `https://docs.arsel.sa/…` is also served as Markdown at the same URL + `.md`; the index is `https://docs.arsel.sa/llms.txt`. OpenAPI: `https://api.arsel.sa/v1/openapi.json` |

**Keys.** `be_` keys are secret, org-wide, and **expire one year after creation** with no
extension — build rotation in (create new → deploy → watch the old key's last-used time → revoke).
`pub_` keys are the publishable client keys the SDKs use; they cannot send messages. If you are
building an app that acts for *other* Arsel customers, don't collect their keys — use
[Sign in with Arsel (OAuth)](https://docs.arsel.sa/guides/oauth.md).

## The send endpoints

| Channel | Endpoint | Prerequisite | Reference |
|---|---|---|---|
| Email | `POST /email/send` | `from` on a **verified domain** | [email.md](references/email.md) |
| SMS | `POST /sms/send` | `from` is a **registered sender name** for the recipients' country | [sms.md](references/sms.md) |
| WhatsApp | `POST /whatsapp/send` | Connected WhatsApp Business account + a **Meta-approved template** | [whatsapp.md](references/whatsapp.md) |
| Push | `POST /push/send` | Push configured per platform; devices bound to the contact | [push.md](references/push.md) |
| Events | `POST /events/send` | The event name is **defined** first | [events.md](references/events.md) |

Contacts, lists, tags, segments and campaigns: [contacts.md](references/contacts.md).

**Every send returns `202 Accepted` with an `id`.** 202 means *queued*, not delivered. Track the
outcome with `GET /email/:id`, `GET /sms/:id`, `GET /whatsapp/:id` or `GET /push/:id`. Don't report
"delivered" to a user off the 202.

## Idempotency — send a key on every send

Every send endpoint (and campaign send/cancel) accepts an `Idempotency-Key` header. A retry after a
timeout without one can deliver the message twice — and SMS and WhatsApp bill twice. A second OTP
also invalidates the first.

- Derive the key from the thing the message is about, so a retry regenerates it without storing
  anything: `order-1042-receipt`, `otp/{user_id}/{attempt}`, `order.completed/A-1023`.
  Never derive it from the current time — a retry a second later gets a different key.
- Same key + same body within 24 h → the original response is replayed (`Idempotent-Replayed: true`).
- Same key + **different** body → `409 invalid_idempotent_request`. Use a fresh key for a genuinely
  different request.
- `503 concurrent_idempotent_requests` → the first attempt is still in flight; retry shortly.
- Keys are scoped per endpoint and expire after 24 h. Idempotency is retry safety, **not**
  deduplication — "never send this twice, ever" is your own database's job.
- `POST /contacts` and other creates don't take keys; duplicates return `409`.

## Errors and retries

Branch on `name`, fall back to `status_code`, and never match on `message` (not a stable contract).

| Status / `name` | Retry? | Meaning |
|---|---|---|
| `422 validation_error` | No | Body failed validation; `message` lists every issue, comma-separated |
| `400 bad_request` | No | Business rule: unverified sender domain, too many recipients, unregistered SMS sender… |
| `401 unauthorized` | No | Missing, invalid, revoked or **expired** key |
| `403 sending_suspended` | No | Email suspended for high bounce/complaint rate — needs a human |
| `403 forbidden` | No | e.g. contact opted out of push, insufficient WhatsApp balance |
| `429 rate_limit_exceeded` | **Yes** | Wait `retry-after` seconds |
| `429 monthly_quota_exceeded` | No | Plan's monthly channel quota used up — retrying never helps |
| `500`, `502`, `503`, `504` | Yes, with backoff | Keep the same `Idempotency-Key` so the retry is safe |

**Rate limits.** 1,000 requests per 60-second fixed window **per organization**, shared by every
key (more keys don't raise it). `POST /events/send` has its own budget of 6,000 **events** per
60 s. `ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset` (seconds, not a timestamp) are
on **successful** responses only; a `429` carries just `retry-after`. Pace bulk work off
`ratelimit-remaining` rather than firing everything at once.

## Identifying a contact

Push, events and contact lookups identify the person the same way:

- `contact_id` **on its own**, or
- any of `external_id`, `email`, `phone_number` (E.164, e.g. `+966501234567`), tried in that order.

Combining `contact_id` with the others is a `400`. Prefer **`external_id` = your own user's
primary key** (not a previous vendor's id): it survives email and phone changes. Sending
`external_id` together with `email` lets an existing contact found by email adopt the id, so later
`external_id`-only calls find the same person instead of creating a duplicate.

## Before you write the code

1. Which channel(s)? Each has a different prerequisite (table above) — check it's in place, or say
   it needs doing in the dashboard.
2. Is it transactional (one person, triggered by their action) or marketing to an audience? The
   latter is a campaign or an automation, not a loop over `/email/send`.
3. Read the channel's reference file before writing the request body — field names differ across
   channels (`html`/`text` on email, `content` on SMS, `template_name`/`parameters` on WhatsApp,
   `title`/`body` on push).
