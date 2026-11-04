# Contacts, audiences and campaigns

Guide: https://docs.arsel.sa/guides/audience.md · API index: https://docs.arsel.sa/llms.txt

Everything you send to an audience targets **contacts**. Read the specific page before writing a
request — this file is a map, not the full schema.

| Task | Endpoint | Docs |
|---|---|---|
| Create a contact | `POST /contacts` | /api/contacts/create-contact.md |
| Update | `PATCH /contacts/:id` | /api/contacts/update-contact.md |
| List / filter (cursor pagination) | `GET /contacts` | /api/contacts/list-contacts.md |
| Delete one / bulk (≤ 1,000) | `DELETE /contacts/:id`, `POST /contacts/bulk-delete` | /api/contacts/delete-contacts.md |
| Lists, tags | `/lists`, `/tags` | /api/lists/…, /api/tags/… |
| Segments (dynamic) | `/segments` | /api/segments/… |
| Custom properties | `/properties` | /api/properties/… |
| Campaigns | `/email/campaigns`, `/sms/campaigns`, `/push/campaigns` | /api/{email,sms,push}/campaigns/… |
| Automations | `/automations` | /api/automations/… |

Prepend `https://docs.arsel.sa` to the docs paths.

## Rules worth knowing up front

- **Sync on `external_id`.** Store your own user id as `external_id` on create; it's unique per org
  and survives email/phone changes. Phone numbers are E.164.
- Creates don't take idempotency keys — a duplicate is `409`. On sync, treat `409` as "exists, update
  instead".
- `GET /contacts?segment_id=…` can return `409 segment_not_ready` while a new segment computes —
  retry later, don't fail.
- Deleting a segment used by a scheduled or sending campaign is `409 segment_in_use`.
- Pagination is cursor-based — follow the cursor; see /api-basics/pagination.md.

## Marketing sends are campaigns, not loops

To message an audience, create a campaign targeting `list_ids` / `tag_ids` / `segment_ids`, then
send or schedule it (`POST /{channel}/campaigns/:id/send`, with an `Idempotency-Key` like
`campaign-{id}-send`). Looping over `/email/send` for thousands of people burns the 1,000-req/min
budget, skips campaign analytics, and leaves unsubscribe handling to you. For behaviour-driven
messages (cart abandoned, welcome series), send events and let an automation do the messaging.

Email campaigns take their body from a saved template: `POST /templates` with `{ name, html }`,
then `POST /email/campaigns` with `template_id`, `subject`, `from`, `from_name` and the audience.

- Put `{{unsubscribe_link}}` in the template HTML for a per-recipient unsubscribe link; a footer is
  appended if it's missing. An anchor that says "Unsubscribe" but points at your own URL makes the
  **send** fail with `400`.
- Templates are sanitized on save (scripts and event handlers removed), so re-read the stored HTML
  after creating one.
- Send with an empty body to go now, or `{ "scheduled_at": "<ISO 8601>" }` to schedule. Calling
  send again moves the schedule; `POST /email/campaigns/:id/cancel` cancels before it starts.
- Stats: `GET /email/campaigns/:id/stats`.
- Campaign `status` values are **lowercase** on the wire: `draft`, `scheduled`, `queued`, `sending`,
  `paused`, `sent`, `failed`, `cancelled`, `archived` (some docs pages show them capitalized —
  compare case-insensitively). A job that must not double-send should key on its own campaign
  name/id and check status before calling send.
