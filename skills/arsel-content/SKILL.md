---
name: arsel-content
description: Use when writing or designing the content of messages sent through Arsel — email templates and newsletters, transactional email HTML, SMS text, and WhatsApp message templates — especially in Arabic, bilingual Arabic/English, or for recipients in Saudi Arabia. Use it whenever the user asks to write, fix, shorten or review an email, SMS or WhatsApp message for Arsel, estimate SMS parts or cost, or get a WhatsApp template approved, even if they only ask for "the text" — merge-tag names, the template sanitizer, Unicode SMS parts, KSA sender and timing rules, and Meta's template review all change what correct content looks like.
license: MIT
metadata:
  author: Arsel
  version: "0.1.0"
  homepage: https://docs.arsel.sa
  source: https://github.com/Arsel-SA/arsel-skills
references:
  - references/email.md
  - references/sms.md
  - references/whatsapp.md
---

# Writing content for Arsel

This skill is about **what goes inside** an email, SMS or WhatsApp message sent through Arsel. For
the API calls themselves (keys, idempotency, endpoints, errors), use the `arsel-api` skill; the
endpoints below are only what content work touches.

Read the reference for the channel you are writing for:

| Channel | Read | Endpoint content lands in |
|---|---|---|
| Email | [email.md](references/email.md) | `POST /v1/templates` (saved templates), `POST /v1/email/send` (`html`/`text`, or `template_id` + `variables`) |
| SMS | [sms.md](references/sms.md) | `POST /v1/sms/send` (`content` + `variables`), SMS campaigns |
| WhatsApp | [whatsapp.md](references/whatsapp.md) | `POST /v1/whatsapp/templates`, then `POST /v1/whatsapp/send` with `parameters` |

## Merge tags: the names depend on who fills them in

All channels use `{{key}}`. What `key` can be depends on the send:

| Send | Values come from | Keys |
|---|---|---|
| Email or SMS **campaign**, or an **automation** step | The contact | `{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{phone}}`, plus any contact property key as stored, e.g. `{{city}}` |
| **Transactional** `POST /email/send` or `/sms/send` | The request's `variables` object | Whatever keys you put in `variables`. Contact fields are **not** filled in |
| **WhatsApp** template | The send's `parameters` object | The template's own named placeholders, lowercase snake_case: `{{first_name}}` |

- In a campaign, `{{first_name}}` is **not** the contact's first name. It only resolves if a contact
  property is literally called `first_name`; otherwise it renders blank. Use `{{firstName}}`.
- `{{key|default}}` gives a fallback when the value is empty: `مرحباً {{firstName|عميلنا}}`.
- A tag that resolves to nothing renders as empty text, so write sentences that still read when a
  name is missing, or give a default.
- With inline `html` on `POST /email/send`, values are inserted as-is, not HTML-escaped. Escape
  anything a customer typed (names, addresses) before you put it in `variables`.

## Arabic content: the traps

- **SMS:** any Arabic character makes the whole message Unicode: **70 characters** in one part,
  **67** per part after that. Count before you quote a cost ([sms.md](references/sms.md)).
- **Email:** the bare `{{unsubscribe_link}}` and Arsel's automatic footer are in English; write an
  Arabic unsubscribe link yourself ([email.md](references/email.md)).
- **WhatsApp:** Arabic is language `ar` (there is no `ar_SA`), as its own template with the same
  name as the English one ([whatsapp.md](references/whatsapp.md)).

## Saudi Arabia: rules that decide whether a message is delivered

| Rule | Applies to | Status |
|---|---|---|
| Sender names are registered per country through Arsel (support@arsel.sa) before use | SMS | Hard rule |
| Promotional SMS comes from a separate sender ending in **`-AD`** (e.g. `Shop-AD`); the plain sender is for transactional messages only | SMS | Hard rule (operator requirement) |
| Promotional SMS needs prior consent and an opt-out in the message | SMS | Hard rule; exact wording is set by the operator, ask Arsel support |
| Send promotional SMS in daytime, Saudi time (UTC+3): **09:00 to 20:00** is the window every provider accepts | SMS | Providers publish different cut-offs (20:00 to 21:45, different in Ramadan); treat 20:00 as the safe limit |
| Numbers on an operator's do-not-disturb list don't receive marketing SMS; they come back undelivered. Transactional traffic is unaffected | SMS | Hard rule |
| No public URL shorteners (bit.ly etc.), and no gambling, loans, alcohol, political or religious content in promotional SMS | SMS | Operator filtering, reported by providers |
| A WhatsApp template with any offer, discount or upsell is **marketing**, whatever category you submit it as | WhatsApp | Meta rule |

When you are unsure about a rule, say which parts are hard rules and which are recommendations,
and point the user to Arsel support for the operator-specific details.
