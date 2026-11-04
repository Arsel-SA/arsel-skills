# Events — `POST /events/send`

Full reference: https://docs.arsel.sa/api/events/send-event.md · Guide: https://docs.arsel.sa/guides/events.md

Product events (`order.completed`, `cart.abandoned`) trigger automations, feed segments, and count
as conversions/revenue.

## 1. Define the event first

Sending an undefined name fails with `404 event_not_found`. Create the definition once — in the
dashboard or with `POST /events`:

```json
POST /v1/events
{
  "name": "order.completed",
  "description": "A checkout finished",
  "schema": {
    "fields": [
      { "name": "order_id", "type": "string", "required": true },
      { "name": "total",    "type": "number", "required": true },
      { "name": "currency", "type": "string", "required": false }
    ]
  },
  "conversion": { "enabled": true, "value_field": "total", "currencies": ["SAR", "USD"], "currency_field": "currency" }
}
```

`schema` is an object with a `fields` array, not a bare array. Event names (1–80 chars) are
**immutable**; use `noun.verb`. Field names: letters, digits, underscores. Types: `string`,
`number`, `boolean`, `date`. Names starting `arsel.` belong to the SDKs.

`conversion` is optional and makes the event count toward revenue. `value_field` must name a
`number` field (or be `null` for count-only); one currency is fixed, several need a
`currency_field`. Conversions count only from the moment they're enabled.

## 2. Send occurrences

```json
POST /v1/events/send
Idempotency-Key: order.completed/A-1023

{
  "event": "order.completed",
  "external_id": "user_10294",
  "email": "sara@example.com",
  "data": { "order_id": "A-1023", "total": 149.99, "currency": "SAR" },
  "timestamp": "2026-06-01T12:00:00.000Z"
}
```

Response: `202 { "id": "…", "status": "accepted" }`.

- Identify the contact as in SKILL.md. If nothing matches, a contact is **auto-created** with every
  identifier you sent — so send `external_id` + `email` rather than a guess.
- `timestamp` is when it happened (ISO 8601); defaults to server time. Set it when backfilling.
- Idempotency key: your own event/order id. A retried event without one double-counts revenue.

## Payload validation traps

| Declared type | Accepts | Rejects |
|---|---|---|
| `number` | `149.99` | `"149.99"` (a numeric **string**), `NaN` |
| `boolean` | `true` | `"true"`, `1` |
| `date` | a parseable **string** `"2026-03-05"` | epoch numbers |

Missing required field → `422 schema_mismatch`. **Undeclared keys are accepted silently** — a typo
(`totl`) doesn't error, it's stored and never matches an automation condition. Use the definition's
exact field names.

## Backfilling history

Before writing a backfill, tell the user what it will and won't do:

- **Revenue won't appear.** Arsel reports revenue only when a conversion is credited to a campaign
  or automation touch (an open, click, delivery or tap shortly before it), counted from when the
  conversion was enabled. Orders from before Arsel have no touch to credit, so they never show
  as revenue. Backfilled events still help segments ("ordered 3+ times", "last order before
  June") and contact history.
- **Every live automation triggered by the event will fire.** Disable or pause those automations,
  or the backfill messages every historic customer. There is no "don't trigger" flag on a send.
- Contacts that don't exist yet are created for every identifier you send — import contacts first
  if consent or plan limits matter.
- Set a cutoff so the backfill doesn't overlap events your live integration already sends, set
  `timestamp` from the original time (with an explicit time zone), and checkpoint so a re-run
  resumes instead of re-sending — idempotency keys only last 24 h.

If the real goal is "show customer history", per-contact properties (lifetime value, order count,
last order date) via the contacts API are usually the better fit.

## Batches

`{ "events": [ … up to 50 items of the same shape … ] }`.

- Items are **independent**: the response is `202` even if some failed. Read `results[i]` — each
  slot is `{ id, status }` or `{ error }`, in the order sent.
- One `Idempotency-Key` covers the whole batch; you can't retry just the failed items under it.
  Send failed items again individually (new keys) after fixing them.
- The rate budget is **6,000 events / 60 s** per org, counted per event — a 50-item batch spends 50.
  Batching saves round trips, not budget. Pace off `ratelimit-remaining`.
