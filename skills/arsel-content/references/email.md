# Email content

## What a saved template goes through

`POST /v1/templates` and `PATCH /v1/templates/:id` clean the HTML before saving it:

| Kept | Removed |
|---|---|
| `<html>`, `<head>`, `<title>`, `<meta>`, `<style>` blocks and `<link>` stylesheets | `<script>`, `<iframe>`, `<object>`, `<embed>`, `<base>` |
| Tables, `class`, `style`, `dir`, `lang`, `align`, `bgcolor`, `width` | `on*` event handlers |
| Links and images on `http`, `https`, `mailto` and `data` | Every HTML comment, **including Outlook's `<!--[if mso]>` blocks** |
| | Links on any other scheme: **`tel:` links lose their href** |

So:
- Don't build Outlook fixes on conditional comments or VML; they are deleted. Use plain tables
  with explicit `width` attributes, `bgcolor`, and padded-link "bulletproof" buttons.
- Show a phone number as text, not a `tel:` link.
- Put critical styles inline. `<style>` survives in the template, but Gmail and others drop or limit
  it.
- Images need absolute `https` URLs, `width`/`height`, and `alt` text (many clients block images).

## Subject

- A `template_id` send uses the template's `<title>` as the subject unless the request passes
  `subject`; with neither, the send is refused with a 400. Give every template a `<title>`.
- The subject takes merge tags too.
- Campaigns set their own subject, plus an optional `preheader` (the inbox preview line). Write the
  preheader; otherwise the client shows the first text of the body.

## Unsubscribe

| Write | You get |
|---|---|
| `{{unsubscribe_link}}` on its own | A link with the English text "Unsubscribe" |
| `<a href="{{unsubscribe_link}}" style="…">إلغاء الاشتراك</a>` | Your own text and styling, pointing at the contact's unsubscribe URL. Use this for Arabic |
| An anchor whose text says "unsubscribe" with **your own URL** in `href` | `400`: "Your template contains a custom unsubscribe URL…", both when saving the template through the API and when sending a campaign |
| Nothing | Campaigns append a small footer with an unsubscribe link before `</body>` |

- Campaigns also add `List-Unsubscribe` headers, which give Gmail, Outlook and Apple Mail their own
  unsubscribe button.
- Transactional sends (`POST /email/send`) remove the unsubscribe link and keep its text. Don't
  put one in an order confirmation, password reset or receipt.
- A marketing email should also show the sender's postal address in the footer.

## Merge tags in templates

- Campaign and automation sends fill `{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{phone}}` and
  contact property keys from the contact. `{{first_name}}` is not the contact's name.
- `template_id` sends fill tags from `variables` in the request and escape the values. Inline `html`
  sends insert `variables` as-is, so escape customer-typed values yourself.
- `{{key|default}}` falls back when the value is empty.
- A template used for both campaigns and transactional sends needs keys that work in both: either
  name your transactional `variables` `firstName` etc., or keep separate templates.

## Arabic and bilingual email: what's specific to Arsel

General RTL email practice applies (`dir="rtl" lang="ar"`, direction repeated inline on tables and
cells because Gmail drops it from `<html>`/`<body>`, LTR runs such as order numbers in
`<span dir="ltr">`, an Arabic-capable stack like `Tahoma, Arial, sans-serif`, one section per
language for bilingual mail). On top of that:

- `dir` and `lang` survive the sanitizer, so set them on every table and cell that needs them.
- `{{unsubscribe_link}}` on its own renders English "Unsubscribe". In an Arabic section write
  `<a href="{{unsubscribe_link}}">إلغاء الاشتراك</a>`.
- The campaign footer Arsel appends when there is no unsubscribe link is English. Add your own
  Arabic one instead of relying on it.
- Default values can be Arabic: `{{firstName|عميلنا}}`.
