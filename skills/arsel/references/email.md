# Email — `POST /email/send`

Full reference: https://docs.arsel.sa/api/email/send-email.md

```ts
const res = await fetch('https://api.arsel.sa/v1/email/send', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.ARSEL_API_KEY}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `order-${order.id}-receipt`,
  },
  body: JSON.stringify({
    from: 'orders@yourdomain.com',
    from_name: 'Acme Orders',
    to: [customer.email],
    subject: 'Order {{order_id}} confirmed',
    html: '<p>Hi {{name}}, thanks for your order.</p>',
    variables: { name: customer.firstName, order_id: order.id },
    category: 'order-confirmation',
  }),
});
const data = await res.json();
if (!res.ok) throw new Error(`${data.name}: ${data.message}`);
// data.id → GET /email/:id for per-recipient status
```

## Body

| Field | Required | Notes |
|---|---|---|
| `from` | yes | Must be on a **verified domain** (dashboard → Domains, or `POST /email/domains` + `/verify`). Unverified → `400` |
| `from_name` | **yes** | Display name, max 256. Easy to forget — it is required, not optional |
| `to` | yes | **Array** of addresses |
| `subject` | with `html`/`text` | Max 998. Optional with `template_id` (template's subject is used) |
| `html` / `text` | one content source | You may send `html` + `text` together |
| `template_id` | one content source | Saved template; not combinable with `html`/`text`. `404` if not in your org |
| `variables` | no | `{{name}}` replacement in subject/html/text. Case-sensitive; unmatched placeholders stay literal |
| `cc`, `bcc`, `reply_to` | no | |
| `attachments` | no | See below |
| `category` | no | Analytics label, max 100 |

Exactly one content source: `html` and/or `text`, **or** `template_id`.

## Limits that reject the whole request

- `to` + `cc` + `bcc` ≤ **50** recipients. More → `400`. Split into several calls (or use a
  campaign for an audience).
- Any **malformed** address → `422`, nothing is sent.
- Attachments: ≤ 10, each `{ filename, content (base64), content_type?, content_id? }`. Whole body
  ≤ **30 MB** (≈ 22 MB of files after base64) → else `413`. Executables/scripts (`.exe`, `.bat`,
  `.js`, `.ps1`…) → `400 attachment_rejected` and nothing is sent.
- Inline image: give it a `content_id` and reference `<img src="cid:logo">`.
- Calendar invite: `.ics` with `content_type: "text/calendar; method=REQUEST"` (or `CANCEL`).

## After the 202

Well-formed but undeliverable addresses (no MX, disposable, suppressed) are **dropped silently
after** the 202 — the rest still send. A recipient stuck at `sent` in `GET /email/:id` (never
`delivered`/`bounced`) was most likely filtered. Per-recipient `status` goes `sent` → `delivered` →
`opened`/`clicked`, or `bounced`.

High bounce or complaint rates suspend email for the whole organization (`403 sending_suspended`)
— validate addresses at signup and don't send to scraped lists.

## SMTP

There is also an SMTP relay with its own credentials (not the API key):
https://docs.arsel.sa/guides/email/smtp.md
