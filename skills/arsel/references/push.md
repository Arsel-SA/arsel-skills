# Push — `POST /push/send`

Full reference: https://docs.arsel.sa/api/push/send-push.md · Setup: https://docs.arsel.sa/guides/push.md

Push addresses a **contact, never a device token**. The notification goes to every active device
bound to that contact. Devices get bound by the client SDKs (`identify()` on login) or server-side
with `POST /push/devices` — an anonymous device that was never bound can't be targeted.

```json
POST /v1/push/send
Idempotency-Key: shipment-7731-out-for-delivery

{
  "external_id": "user_8821",
  "title": "Your order shipped",
  "body": "Order A-1023 is on its way — arriving Thursday.",
  "deep_link": "myapp://orders/A-1023",
  "category": "order_update",
  "data_payload": { "order_id": "A-1023" }
}
```

| Field | Required | Notes |
|---|---|---|
| contact | yes | `contact_id` alone, or `external_id` / `email` / `phone_number` |
| `title` | yes | 1–200 chars |
| `body` | yes | 1–1000 chars |
| `image_url`, `icon_url` | no | **HTTPS only** |
| `deep_link` | no | Opened on tap |
| `action_buttons` | no | ≤ 3 × `{ action_id, label, deep_link? }` |
| `data_payload` | no | **Flat string→string** map. Keys starting `arsel_`, `google`, `gcm` are rejected (`422`) — numbers must be sent as strings |
| `ttl_seconds` | no | 60–2,419,200 |
| `priority` | no | `high` or `normal` |
| `android_channel_id`, `category` | no | |

## Gotchas

- **No transactional exemption.** If the contact opted out of push or has no deliverable device,
  the send is `403`. For essential messages (security alerts, OTPs) fall back to email or SMS.
- A contact with **no active device** is a `202` (successful skip), not an error.
- `404` is deliberately the same whichever identifier you used.
- Delivered/opened/clicked come **from the SDK on the device**. Devices imported server-side
  without the SDK receive pushes but report zero engagement.
- Prerequisite, per platform, in the dashboard (Integration → Push): a Firebase service-account
  JSON for Android, an APNs `.p8` key + Key ID + Team ID + bundle ID for iOS (no Firebase on iOS),
  and allowed origins for web.
- Migrating tokens from another provider: `POST /push/devices/bulk` (1,000 per call, each row the
  Register Device body: `installation_id`, `platform`, `device_token`, a contact identifier).
  **Import contacts first** — a device import never creates a contact (rows fail
  `CONTACT_NOT_FOUND`). Omit `sdk_version` so a later SDK build adopts the device. iOS rows must
  carry **APNs** tokens (FCM tokens from a provider that relayed iOS through Firebase can't be
  imported as iOS) and `apns_environment: "sandbox"` for development-build tokens. The import is a
  background job: poll `GET /push/imports/:job_id` and reconcile its per-row `errors`.

Campaigns to an audience: `POST /push/campaigns` with `list_ids` / `tag_ids` / `segment_ids`, then
send or schedule — see [contacts.md](contacts.md).
