# Android SDK — `sa.arsel:core` + `sa.arsel:push-fcm`

Source of truth: https://github.com/Arsel-SA/arsel-android-sdk/tree/main/docs (api-reference,
identity, push-notifications, troubleshooting, data-safety).

`minSdk 23`, `compileSdk`/`targetSdk 35`, Kotlin 1.9+. Check the repo's releases for the latest
version.

## Dependencies

```kotlin
dependencies {
    // events + push. push-fcm pulls in core.
    implementation("sa.arsel:push-fcm:<version>")
    implementation(platform("com.google.firebase:firebase-bom:<ver>"))
    implementation("com.google.firebase:firebase-messaging")   // your app owns the Firebase version
}
```

Events only: depend on `sa.arsel:core` alone and skip Firebase.

Firebase is `compileOnly` inside the SDK, so the app must add `firebase-messaging` itself and have
`google-services.json` + the Google Services plugin as for any FCM app. The FCM service, tap
Activity, `POST_NOTIFICATIONS` and `INTERNET` merge in from the SDK manifest — nothing to add for
the default case.

## Initialize in `Application.onCreate()`

```kotlin
import sa.arsel.core.Arsel
import sa.arsel.core.ArselConfig
import sa.arsel.core.log.LogLevel   // only if you set .logLevel(...)

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        Arsel.initialize(
            this,
            ArselConfig.Builder(clientKey = BuildConfig.ARSEL_CLIENT_KEY, baseUrl = "https://api.arsel.sa")
                .defaultChannel("arsel_default", "Notifications")
                .smallIcon(R.drawable.ic_stat_notify)   // white-on-transparent silhouette
                .build(),
        )
    }
}
```

`clientKey` is the `pub_` key (fine in `BuildConfig`). Emulator against a local backend:
`http://10.0.2.2:<port>`, not `localhost`.

Every entry point is crash-isolated: misuse is logged, never thrown. Calls before `initialize()`
are ignored — so initialize in `Application`, not in an Activity.

## Track, identify, logout

```kotlin
Arsel.track("product.viewed", mapOf("sku" to "A-1023", "price" to 149.99))

// after login — once
Arsel.identify(externalId = user.id)

// on logout
Arsel.reset()
```

Use 1.3.2 or later. **On 1.3.1 and earlier `reset()` doesn't move the push subscription**: the
device stays bound to the contact who logged out, so on a shared phone the previous user's pushes
keep arriving. If a project can't upgrade, call `Arsel.registerNow()` right after `reset()`; that
forces a registration under the new anonymous id, which rebinds the device.

Changing `externalId` to a different value drops stored email/phone — re-assert them if needed.
If your backend must be the authority on who owns a device, send `Arsel.getInstallationId()` to it
and bind server-side with `POST /v1/push/devices` (secret key, server only).

## Notification permission (Android 13+)

Ask through `Arsel.requestNotificationPermission`, even if the app already has its own permission
flow — route that flow's launch through this call. Android reports "never asked" and "asked and
refused" identically, so the SDK only knows a refusal happened if it launched the prompt; otherwise
push analytics can't tell refused users from unasked ones.

```kotlin
private val notifPermission =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> /* … */ }

// after your own primer UI, from a user action:
Arsel.requestNotificationPermission(notifPermission)
```

No-op below API 33.

## Apps that already have a `FirebaseMessagingService`

Only one service receives FCM messages. If the app has its own, remove the SDK's and forward to it —
otherwise Arsel pushes are swallowed by your service and never show:

```xml
<service android:name="sa.arsel.push.fcm.ArselPushService" tools:node="remove" />
```

```kotlin
override fun onNewToken(token: String) {
    Arsel.setPushToken(token)
    // your logic
}

override fun onMessageReceived(message: RemoteMessage) {
    if (!Arsel.handlePushData(applicationContext, message.data)) {
        // not Arsel's — your own pushes
    }
}

override fun onDeletedMessages() {
    Arsel.handleDeletedMessages()
}
```

Call `handlePushData` first and fall through when it returns `false`. If existing code gates on
`Arsel.isArselData(...)` instead, it needs 1.3.2 or later: earlier versions recognise notification
envelopes only, so Arsel's in-app sync pushes (`arsel_iam_sync`) land in the host's handler and
in-app messages never refresh. Keep the
SDK's App Startup `InitializationProvider` in the manifest — it's how `initialize()` fetches the
current FCM token for users whose `onNewToken` already fired before the update.

## Debugging

`Arsel.diagnostics()` returns a support snapshot (`configError` explains a refused start).
`.logLevel(LogLevel.DEBUG)` on the builder logs SDK decisions.
