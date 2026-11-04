# WhatsApp templates

Every business-initiated WhatsApp message is a Meta-approved template. Approval depends on the
category being right and the text following Meta's review rules.

## Pick the category honestly

| Category | For | Sent through Arsel with |
|---|---|---|
| `utility` | A specific transaction or account event the user started: order confirmed, shipped, payment failed, appointment reminder | `POST /v1/whatsapp/send` |
| `authentication` | One-time codes only. Meta fixes the wording | `POST /v1/whatsapp/send` with `parameters.code` |
| `marketing` | Anything promotional: offers, discounts, abandoned carts, win-back, new products, newsletters | A dashboard **campaign** or an **automation** step. Both check marketing consent. `POST /whatsapp/send` doesn't send marketing templates |

- A utility template that contains an offer, a discount code, an upsell, "complete your order now"
  urgency, or vague text with no transaction behind it gets **recategorized as marketing** (and
  priced as marketing). Meta can do this after approval too, with a day's notice.
- **Abandoned cart is marketing.** Submit it as `marketing` and send it from an automation: send an
  event such as `cart.abandoned` from your backend, and let an automation that starts on that event
  wait and then send the template.
- Repeatedly submitting promotional content as utility can get all of an account's utility
  templates recategorized.

## Placeholders in Arsel

- Named, lowercase snake_case: `{{first_name}}`, `{{order_id}}`, `{{discount_code}}`. Up to 60
  characters, starting with a letter. **Numbered placeholders like `{{1}}` are not accepted.**
- A name is used in the header or the body, not both.
- The keys you pass in `parameters` on a send are these names.
- Meta needs a sample value for every placeholder. Arsel fills samples in for you; give your own
  (realistic ones help approval) with Meta's `example` object:
  `"example": { "body_text_named_params": [{ "param_name": "first_name", "example": "Sara" }] }`

## Meta's review rules

- The text must not **start or end** with a placeholder. Put words before the first and after the last.
- Don't put two placeholders side by side (`{{code}} {{expiry}}`); join them with words.
- Not too many placeholders for the amount of text. A message that is mostly placeholders is rejected.
- Same body as another of your templates in that language: rejected.
- Limits: header text 60 characters with at most one placeholder; body 1,024; footer 60 with none;
  button labels 25.
- Through the API, headers are text only; image, video and document headers are created in the dashboard.

## Languages

- One template per language, with the same `name`: `"language": "en"` and `"language": "ar"`.
  **Arabic is `ar`; there is no `ar_SA`.**
- When a name exists in several languages, the send must say which `language`, or it returns 409.
- Meta doesn't translate: write each language yourself, naturally, not word for word.
- In Arabic, the start/end rule still applies, and Latin text (brand names, codes) reads best inside
  a placeholder or between Arabic words.

## Edits and status

- New templates are `pending` until Meta reviews them (minutes to a day); then `approved`,
  `rejected` (with a `rejection_reason`) or `paused`.
- An approved template can be edited at most once per 24 hours and 10 times per 30 days, and each
  edit sends it back to `pending`. For a big change, create a new template name instead.

## Example: a shipping update that stays utility

Rejected: `{{order_id}} has shipped! Use code {{code}} for 15% off your next order {{link}}`. It
starts and ends with a placeholder, and the discount makes it marketing.

Fixed: drop the offer (send it as a separate marketing template if you want it) and put words
around every placeholder.

```json
{
  "name": "order_shipped",
  "language": "ar",
  "category": "utility",
  "components": [
    { "type": "BODY",
      "text": "مرحباً {{first_name}}، تم شحن طلبك رقم {{order_id}} وسيصلك خلال {{delivery_days}} أيام عمل. شكراً لتسوقك معنا.",
      "example": { "body_text_named_params": [
        { "param_name": "first_name", "example": "سارة" },
        { "param_name": "order_id", "example": "A-1029" },
        { "param_name": "delivery_days", "example": "3" } ] } },
    { "type": "BUTTONS", "buttons": [
      { "type": "URL", "text": "تتبع الشحنة", "url": "https://store.example.sa/orders" } ] }
  ]
}
```

Create it with `POST /v1/whatsapp/templates`, then the English version with the same `name` and
`"language": "en"`. Send it with `POST /v1/whatsapp/send`, passing `first_name`, `order_id` and
`delivery_days` in `parameters`.
