# iOS SDK — Swift package

Source of truth: https://github.com/Arsel-SA/arsel-ios-sdk/tree/main/docs (quickstart,
api-reference, push-notifications, identity).

iOS 15+, Swift 5.10+ (Xcode 15.4+), zero dependencies.

## Install

Xcode → File → Add Package Dependencies → `https://github.com/Arsel-SA/arsel-ios-sdk`, or:

```swift
.package(url: "https://github.com/Arsel-SA/arsel-ios-sdk.git", from: "1.4.0")
```

Products:
- `Arsel` — link into the **app** target.
- `ArselNotificationExtension` — optional, link **only** into a Notification Service Extension
  target (gives `delivered` engagements and rich media).

## Initialize early, once

```swift
import Arsel

// App init / application(_:didFinishLaunchingWithOptions:)
Arsel.initialize(config: ArselConfig(
    clientKey: "pub_…",
    baseUrl: "https://api.arsel.sa"))
```

Misuse is logged, never thrown; calls before `initialize` are ignored.

## Track, identify, logout

```swift
Arsel.track("product.viewed", properties: ["sku": "A-1023", "price": 149.99])

// after login — once
Arsel.identify(externalId: user.id)

// on logout
Arsel.reset()
```

## Push goes straight to APNs — no Firebase

Upload the APNs `.p8` key, Key ID, Team ID and bundle ID in the dashboard (Integration → Push).
One key serves debug, TestFlight and App Store builds; the SDK reports the APNs environment itself.
The app needs the Push Notifications capability.

```swift
// From a user-chosen moment, never at cold start
let granted = await Arsel.requestNotificationPermission()   // also calls registerForRemoteNotifications on grant

// AppDelegate
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Arsel.setPushToken(apns: deviceToken)
}
```

Pass the raw APNs `Data`. If the app also runs Firebase Messaging for other reasons, don't hand
Arsel the FCM token — Arsel delivers via APNs.

SwiftUI apps need a `UIApplicationDelegateAdaptor` to receive the token callback.

**Open/click tracking:** from 1.4.0 the SDK reports taps automatically
(`automaticPushTracking`, on by default). On older versions, call
`Arsel.handleNotificationResponse(_:)` and `Arsel.handleForegroundNotification(_:)` from your
`UNUserNotificationCenterDelegate`, or opens and clicks read zero. Routing `message.deepLink` is the
app's job either way.
