# WhatsApp — `POST /whatsapp/send`

Full reference: https://docs.arsel.sa/api/whatsapp/send-whatsapp.md

WhatsApp forbids business-initiated free text. You send an **approved template by name**. Templates
are created with `POST /whatsapp/templates` (or the dashboard) and must be approved by Meta first —
that takes time, so plan for it. The org also needs a connected WhatsApp Business account and
WhatsApp balance.

```json
POST /v1/whatsapp/send
Idempotency-Key: otp/user_10294/1

{
  "to": "+966512345678",
  "template_name": "verification_code",
  "language": "en",
  "parameters": { "code": "483920" }
}
```

| Field | Required | Notes |
|---|---|---|
| `to` | yes | **One** E.164 number — a string, not an array |
| `template_name` | yes | Name of an approved template |
| `language` | conditional | e.g. `en`, `ar`. Required when the same name is approved in more than one language (else `409`) |
| `parameters` | no | Keyed by **placeholder name**, not position |

## `parameters` by template category

| Category | Pass |
|---|---|
| `AUTHENTICATION` | `{ "code": "483920" }` — copied into the copy-code button automatically |
| `UTILITY` | One entry per `{{placeholder}}`, e.g. `{ "firstName": "Sara", "orderId": "A-1029" }` |
| `MARKETING` | Same as utility; respects the recipient's marketing opt-out |

## Retry rules (they differ from the other channels)

| Status | Retry? | |
|---|---|---|
| `400` | No | Number, template or WhatsApp setup rejected — deterministic |
| `403` | No | Opted out, monthly limit, or insufficient balance |
| `404` | No | Template not found (check name and approval) |
| `409` | No | Key reused with a different body, or `language` missing for a multi-language template |
| `429` | Yes | After `retry-after` |
| `503` | **Yes** | Provider unavailable or a same-key request still processing — **the message was not sent** |

Always send an `Idempotency-Key` with authentication templates: a retry that sends a second code
invalidates the first.

Charges are held on accept and settled from the delivery receipt; rejected messages aren't charged.
Delivery state: `GET /whatsapp/:id`.
