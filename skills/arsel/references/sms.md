# SMS — `POST /sms/send`

Full reference: https://docs.arsel.sa/api/sms/send-sms.md

```json
POST /v1/sms/send
Idempotency-Key: otp/user_10294/1

{
  "from": "MyStore",
  "to": ["+966512345678"],
  "content": "Your code is {{code}}. It expires in 5 minutes.",
  "variables": { "code": "483920" },
  "category": "otp"
}
```

| Field | Required | Notes |
|---|---|---|
| `from` | yes | A **registered sender name** (alphanumeric, 3–11 chars), registered for transactional use **in the recipients' country**. `GET /sms/senders` lists yours. Arsel support provisions new ones — you can't create them via the API |
| `to` | yes | Array of **E.164** numbers (`+9665…`), max 100 |
| `content` | yes | The message body (the field is `content`, not `body` or `text`). Supports `{{variables}}` |
| `variables`, `category` | no | |

## Gotchas

- **One country per request.** Mixing `+966…` and `+20…` in `to` → `422`. Group recipients by
  country and send one request per group, each with a sender approved there.
- **Arabic and emoji switch the whole message to Unicode:** 70 chars for one part, 67 per part when
  split. GSM (Latin) is 160 / 153. Max **10 parts** (670 Unicode / 1,530 GSM) → longer is `400`.
  Each part is billed, so a short Arabic OTP is cheaper than a chatty one.
- Always send an `Idempotency-Key` — a retried SMS is delivered and **billed** twice, and a second
  OTP confuses the user.
- `202` = queued. Delivery receipts arrive later: `GET /sms/:id`.
