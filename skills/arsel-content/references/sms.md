# SMS content

## Parts: count before you quote a cost

Every SMS is billed in parts, and the encoding decides how big a part is:

| Encoding | Used when | One part | Each part of a longer message |
|---|---|---|---|
| GSM-7 | Only Latin letters, digits and basic punctuation | 160 characters | 153 |
| Unicode (UCS-2) | **Any** character outside GSM-7 | 70 characters | 67 |

- It is all or nothing: one Arabic letter, one emoji or one curly quote makes the whole message
  Unicode.
- In Unicode, count UTF-16 code units: an emoji counts as **2**.
- Parts = 1 if length ≤ 70, otherwise ⌈length ÷ 67⌉ (GSM: ≤ 160, otherwise ⌈length ÷ 153⌉).
- `{{variables}}` are filled in **before** counting, so count with realistic values (a long name or
  product title can add a part).
- The maximum is 10 parts (670 Unicode / 1,530 GSM characters); longer sends are refused with a 400.
- Cost of a campaign ≈ parts per message × recipients. Show the arithmetic.

To count exactly, run the text through a script rather than guessing:

```js
const units = [...text].reduce((n, ch) => n + (ch.codePointAt(0) > 0xffff ? 2 : 1), 0);
const parts = units <= 70 ? 1 : Math.ceil(units / 67); // Unicode
```

**English messages:** watch for characters that silently switch to Unicode: `“ ” ‘ ’`, `–`, `—`,
`…`, a non-breaking space, or a pasted Arabic comma `،`. Replace them with plain ASCII. `{ } [ ] ~ \ | ^ €`
stay GSM but count as 2 each.

## Emoji

Avoid them. Each costs 2 characters of a 70-character part, and modern emoji (🔥 💜 🎉, anything
outside the Basic Multilingual Plane) are not reliably delivered on every Saudi route; they can
arrive as blanks or `?`. If a symbol is essential, simple ones like ★ ✓ ♥ are safer.

## Links

- **Campaigns** replace every `http(s)` URL with a short tracked link of about 20 characters
  (e.g. `arsel.sa/r/Ab3dE7x`), so a long URL with UTM parameters doesn't cost extra. Count the link
  as ~20 characters.
- **Transactional** `POST /sms/send` sends the URL exactly as written. Keep it short; use your own
  short domain if you need one.
- Don't use public shorteners (bit.ly, tinyurl…): Saudi operators filter them.

## Variables

`{{key}}`, `{{ key }}` and `{{key|default}}`. In campaigns the keys are `firstName`, `lastName`,
`email`, `phone` and contact property keys; in `POST /sms/send` they are the keys of `variables`. A
missing value is dropped, so give a default or phrase the message so it still reads.

## Sender names and Saudi rules

- The `from` is a registered sender name, 3 to 11 characters (letters, digits, `_`, `-`, spaces
  between words). Register through Arsel support (support@arsel.sa); each name is approved per
  country, and has a purpose: a **transactional** sender for `POST /sms/send` and a **marketing**
  sender for campaigns.
- **Promotional SMS in Saudi Arabia must come from a sender ending in `-AD`** (e.g. `Shop-AD`).
  Operators reject promotional content from a transactional sender, and transactional senders must
  not carry offers. Keep the base name short: some operators cap `-AD` names at 8 characters
  including the suffix (`ExShop-AD` would be too long there).
- **Consent and opt-out:** send promotions only to contacts who agreed to them, and end every
  promotional SMS with an opt-out line. The exact keyword is operator-specific (ask Arsel
  support); a short bilingual line works, e.g. `لإلغاء الاشتراك أرسل STOP`.
- **Timing:** send promotions between **09:00 and 20:00 Saudi time (UTC+3)**. Providers publish
  later cut-offs (up to 21:45) and a different window in Ramadan, but 20:00 is accepted everywhere.
  Schedule campaigns in Saudi time, not the sender's own time zone. Transactional SMS (OTP, order
  updates) can go any time.
- **Do-not-disturb:** numbers on an operator's DND list don't receive marketing SMS and come back
  `undelivered`; contacts who unsubscribed from SMS in Arsel are skipped. Expect fewer deliveries
  than contacts.
- **Content operators block:** gambling, loans and money offers, alcohol, adult, political and
  religious content, public URL shorteners, and WhatsApp links or phone numbers in a promotional
  body.

## A worked example

`وصلت تشكيلة الشتاء الجديدة 🎉 اكتشفها قبل الجميع واستمتع بشحن مجاني للطلبات فوق ٢٠٠ ريال: https://store.example.sa/winter-collection?utm_source=sms&utm_medium=campaign`

- Unicode (Arabic), 167 units as written → **3 parts**.
- As a campaign the link becomes ~20 characters → about 108 units, **2 parts**. Dropping the emoji
  and adding an opt-out line (`لإلغاء الاشتراك أرسل STOP`) gives 131 units, still 2 parts.
- One part means 70 units for everything, link and opt-out included. A promotion with an opt-out
  line rarely fits, so plan for 2 parts and make both count.
- For 50,000 recipients: 50,000 × 2 = **100,000 parts**, fewer after opted-out contacts are skipped.
