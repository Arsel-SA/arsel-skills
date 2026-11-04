# Web SDK — `@arsel.sa/web-sdk`

Source of truth: https://github.com/Arsel-SA/arsel-web-sdk/tree/main/docs (quickstart, api-reference,
identity, web-push, troubleshooting).

Chrome/Edge 79+, Firefox 72+, Safari 16.4+. Push needs HTTPS (`http://localhost` excepted).

```bash
npm install @arsel.sa/web-sdk
```

Script tag alternative: the UMD build exposes `window.Arsel`. Pin the version and add an SRI hash
(or self-host `dist/arsel.umd.cjs`) so a compromised CDN can't run script on your pages.

## Initialize once, early

```js
import Arsel from '@arsel.sa/web-sdk';

await Arsel.init({
  clientKey: 'pub_…',               // publishable; fine in page source
  baseUrl: 'https://api.arsel.sa',
  serviceWorkerPath: '/arsel-sw.js', // only if you want push; omit for events only
});
```

- `init()` is idempotent (a second call returns the first promise), so React StrictMode / double
  mounts are safe. Every other method awaits it, and `track()` calls made before `init()` are
  buffered (up to 100).
- `init()` **never prompts** for notification permission.
- SSR (Next.js, Nuxt, Angular SSR): only call the SDK in the browser — e.g. inside `useEffect` or
  behind `typeof window !== 'undefined'`. It uses IndexedDB and service workers.

## Track, identify, logout

```js
Arsel.track('product.viewed', { sku: 'A-1023', price: 149.99 });

// after login succeeds — once
await Arsel.identify({ externalId: user.id });

// on logout
await Arsel.reset();
```

`identify` takes an object `{ externalId?, email?, phoneNumber? }`. `optOut()` is for a
notification-preferences toggle only — see SKILL.md.

Use 1.3.1 or later. **On 1.3.0 and earlier `reset()` doesn't move a push subscription off the
logged-out user**: the browser keeps receiving their pushes (and in-app messages), and there is no
client-side call to force a rebind. Tell the user about the gap if they must stay on 1.3.0.

`flushNow()` before navigating to an external page (e.g. a payment redirect) so queued events
aren't left waiting for the next visit.

## Web push

1. Dashboard → Integration → Push: enable Web Push and add **every** origin you serve from.
2. Copy the service worker to the **site root**:
   ```bash
   cp node_modules/@arsel.sa/web-sdk/sw/arsel-sw.js public/arsel-sw.js
   ```
   Vite / Next.js / CRA: `public/`. Angular: `src/arsel-sw.js` + an `assets` entry in
   `angular.json`. It must be served from `/`: a worker under `/js/` can only control `/js/`.
3. Pass `serviceWorkerPath: '/arsel-sw.js'` to `init()`.
4. Ask from a click:
   ```js
   button.addEventListener('click', async () => {
     if (await Arsel.promptForPush()) showThanks();
   });
   ```
   `false` (declined, unsupported, or web push not configured) is a normal outcome, not an error.

**Already have a service worker (PWA)?** Don't register a second one in the same scope. Add
`importScripts('/arsel-sw.js')` to yours and init with `serviceWorker: 'external'` instead of
`serviceWorkerPath`. With vite-plugin-pwa / Workbox `generateSW`, that's
`workbox: { importScripts: ['/arsel-sw.js'] }`; with `injectManifest`, call `importScripts` in your
own `sw.ts`.

- **Copy the file, don't bundle it.** Ship `arsel-sw.js` as a static file in `public/` and load it
  with `importScripts`. On 1.3.0, importing `@arsel.sa/web-sdk/sw` into a bundled worker gets
  tree-shaken to nothing. After an SDK upgrade, copy the file again: a copied file doesn't update.
- **Classic worker only.** `importScripts()` throws in an ES-module worker — keep vite-plugin-pwa's
  `devOptions.type` at `'classic'`.
- **Check it's really served.** An SPA fallback that answers `/arsel-sw.js` with `index.html`
  leaves the PWA's worker "activated" but without Arsel's handlers *or* its precache. Verify every
  origin with `curl -I https://<host>/arsel-sw.js` (expect `200`, a JavaScript content type).
- On 1.3.0 only: `arsel-sw.js`'s top-level names (`DB_NAME`, `WIRE`, `SDK_VERSION`…) share your
  worker's global scope, so a clashing `const` stops it installing, and its `notificationclick`
  handler also takes over your own notifications. 1.3.1 fixes both.

**Migrating web push from another provider?** Import the existing VAPID keypair when first
provisioning Web Push. A new keypair makes every existing subscription unreachable, and those users
won't be prompted again.

## CSP and debugging

`connect-src https://api.arsel.sa;` — the SDK talks to `baseUrl` only, uses no cookies.
`debug: true` in `init()` logs SDK decisions. `await Arsel.diagnostics()` returns a secret-free
snapshot (`pendingEvents` only growing = delivery is failing; `lastResponseCode`).
