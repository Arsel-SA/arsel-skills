---
name: arsel-sdk
description: Use when adding Arsel to a website, Android app or iOS app — installing `@arsel.sa/web-sdk`, `sa.arsel:core` / `sa.arsel:push-fcm`, or the `arsel-ios-sdk` Swift package; tracking events and identifying users from the client; wiring login/logout; setting up web push, FCM or APNs notifications through Arsel; or migrating client tracking from CleverTap or another vendor. Use it whenever client-side Arsel code is involved, even a one-line `track()` — the SDKs have traps (publishable `pub_` vs secret `be_` keys, `reset()` vs `optOut()`, service-worker scope, permission prompts on load) that ship silently broken.
license: MIT
metadata:
  author: Arsel
  version: "0.1.0"
  homepage: https://docs.arsel.sa/client-sdks
  source: https://github.com/Arsel-SA/arsel-skills
references:
  - references/web.md
  - references/android.md
  - references/ios.md
---

# Arsel client SDKs

The SDKs run inside your app and do two independent jobs:

1. **Events and identity** — `track()` what people do and `identify()` who they are. Works with no
   push permission, no token, no Firebase. A visitor who declines notifications still has a contact
   and a history.
2. **Push** — register the device so Arsel can deliver to it, and report delivered/opened/clicked.

Keep them independent in your code too: never make a `track()` path wait on push setup.

| Platform | Package | Reference |
|---|---|---|
| Web | `@arsel.sa/web-sdk` (ESM + UMD, no deps) | [web.md](references/web.md) |
| Android | `sa.arsel:core` (events) + `sa.arsel:push-fcm` (push) | [android.md](references/android.md) |
| iOS | Swift package `https://github.com/Arsel-SA/arsel-ios-sdk` | [ios.md](references/ios.md) |

Read the platform's reference before writing code. The SDK repos' `docs/` folders are the
versioned source of truth when you need more: `github.com/Arsel-SA/arsel-{web,android,ios}-sdk`.

## The key: `pub_`, never `be_`

SDKs take the org's **publishable client key** (`pub_…`, dashboard → Integration → Push). It can
only record events and register devices, and is safe in page source, an APK or an IPA.

The secret `be_` API key must **never** appear in client code — anyone can read a bundle or unzip
an APK, and that key controls the whole organization. All three SDKs refuse to start with a key
that doesn't begin `pub_`. If the user hands you a `be_` key for client code, stop and explain.

`baseUrl` is `https://api.arsel.sa`. HTTPS is enforced (localhost excepted, plus `10.0.2.2` on
the Android emulator).

On web the client key is also bound to an **origin allowlist** (dashboard → Integration → Push).
Apex, `www`, staging and `http://localhost:4200` are all separate origins — a missing one is
rejected, and an empty list denies everything.

## Identity: the part that decides whether your data is usable

- **Before login** every event carries an anonymous id; the visitor is already a real contact.
- **On login** call `identify` once with `externalId` = **your own user's primary key** — not
  an email, and not a previous vendor's id. Everything tracked anonymously merges onto that
  contact. Identifiers persist and ride every later event, so don't call it per event.
- Prefer `externalId` alone: it never changes (emails and phones do, creating duplicates), it ranks
  highest in merges, and it keeps PII out of client code. Phone numbers must be E.164
  (`+966501234567`) — malformed values are rejected and logged, not stored.
- **On logout** call `reset()`. It forgets the identity and rotates the anonymous id so the next
  person on a shared device doesn't inherit the previous one's history — or their push
  notifications. It deliberately keeps the device subscribed. **Version floor:** before Android
  1.3.2 and web 1.3.1, `reset()` didn't rebind the push subscription, so the old account's pushes
  kept arriving. Install at least those versions; the platform references cover projects stuck on
  older ones.
- **`optOut()` is not logout.** It is a durable, server-side, non-resurrectable push opt-out for
  this device. Wire it only to a "stop sending me notifications" control. Calling it on logout
  makes the device permanently unreachable.

## Events

- `track(name, properties)` — `noun.verb` names like `product.viewed`, `order.completed`. Names
  starting `arsel.` are ignored (reserved). Max 80 chars.
- Events are persisted before sending and retried; `track()` never throws at you.
- The SDKs record `arsel.app_installed`, `arsel.session_start`, `arsel.session_end` and
  `arsel.identify` on their own — don't re-track them. Screen views are **not** automatic: call
  `screen(name, properties)` on each screen or route change to get `arsel.screen_view` (needed for
  screen-triggered in-app messages and screen segments).
- For an event to **trigger automations** with validated fields, it must be defined in Arsel with
  a schema (dashboard or `POST /v1/events`). Match the defined field names and types exactly: a
  `number` field rejects `"149.99"`, and a misspelled key is silently ignored by automation
  conditions.
- Don't send the same business event from both the client SDK and your server — it double-counts.
  Pick one source; server-side is more reliable for revenue (`order.completed` after payment).

## Push permission

Never prompt on page load or cold start. Ask from a user action after explaining the value:
web `promptForPush()` from a click; Android `requestNotificationPermission(launcher)` after your own
primer (API 33+); iOS `requestNotificationPermission()` at a user-chosen moment. Each platform
gives you roughly one real prompt — a refusal is sticky — and on the web, browsers quiet or
auto-deny origins whose prompts get dismissed a lot.

Push also needs org-side setup in the dashboard first: a Firebase service-account JSON (Android),
an APNs `.p8` + Key ID + Team ID + bundle ID (iOS — no Firebase on iOS), allowed origins (web).

## Migrating from another vendor

Map calls one-to-one (each SDK repo has `docs/migrating-from-clevertap.md`). For identity, use
your own user id, not the old vendor's. Existing mobile tokens can be imported server-side
(`POST /v1/push/devices/bulk`). For web, if you hold the old provider's VAPID keypair (with
CleverTap you created it yourself), import it when Web Push is **first** provisioned — it can't be
added later — and existing subscriptions keep working. Without it, old subscriptions can't be sent
to; browsers that already granted permission re-subscribe silently on their next visit (no prompt),
so web reach rebuilds only as people come back.
