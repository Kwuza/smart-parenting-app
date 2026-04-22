---
id: app-json-001
type: config
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - app.json
confidence: high
status: active
tags:
  - config
  - app-json
  - expo
  - smart-parenting-app
related:
  - config/package-json
  - config/eas-json
  - lib/supabase
---
# Expo App Configuration — app.json

**Location:** project root
**Purpose:** Runtime app config: name, slug, scheme, plugins, extra (env variables)
**EAS override:** `eas.json` controls build-time behavior; `app.json` controls runtime manifest.

---

## Schema Summary

```json
{
  "expo": {
    "name": "Smart Parenting App",
    "slug": "smart-parenting-app",
    "scheme": "smartparenting",
    "version": "1.2.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#FEFBF6" },
    "assetBundlePatterns": ["**/*"],
    "ios": { "supportsTablet": true, "bundleIdentifier": "com.xynate.smartparenting" },
    "android": { "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#FEFBF6" }, "package": "com.xynate.smartparenting" },
    "web": { "bundler": "metro", "output": "single" },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-notifications",
      ["expo-image-picker", { "photosPermission": "Allow app to access photos" }]
    ],
    "extra": {
      "supabaseUrl": "https://xxxx.supabase.co",
      "supabaseAnonKey": "public-anon-key",
      "eas": { "projectId": "xxxx-xxxx-xxxx" }
    }
  }
}
```

---

## Extra Keys — Runtime Secrets

`app.json.expo.extra` is accessible in app code at runtime:

```typescript
import Constants from 'expo-constants'
const { supabaseUrl, supabaseAnonKey } = Constants.expoConfig?.extra
```

**Why not `.env`?** Expo pre-build reads `app.json` to generate native project configs; `.env` not available without Config Plugin. `extra` is the standard way to inject variables into both JS and native layers (for plugins that need them).

**Security:** `supabaseAnonKey` is **public** (client-side). RLS enforces row-level ownership. Service role key **never** stored in `extra`.

---

## Plugins

| Plugin | Purpose |
|--------|---------|
| `expo-router` | File-based routing; required for `app/` directory |
| `expo-secure-store` | Secure keychain/keystore storage |
| `expo-notifications` | Local scheduled push notifications |
| `expo-image-picker` (array form) | Configured photo library permission |

Plugins run during `prebuild` (native project generation). Configuration options (e.g., `photosPermission`) embedded into AndroidManifest/Info.plist.

---

## iOS Specifics

- `supportsTablet: true` — iPad layout enabled
- `Info.plist` permission keys auto-generated from plugins (notifications, photo library)
- `bundleIdentifier` must match Apple Developer account

---

## Android Specifics

- `adaptiveIcon` required for Android 8+
- `package` must be unique (com.xynate.smartparenting)
- `adaptiveIcon.backgroundColor` same as splash → seamless cold-start perception

---

## Deep Linking

`scheme: "smartparenting"` enables:
- `smartparenting://` custom scheme
- Universal Links / App Links with additional configuration (not yet set)

Used for: opening app from notification payload deep to specific screen (e.g., `smartparenting://child/123/routine`). Not implemented yet.

---

## Versioning

`version` string must follow `major.minor.patch`. App Store requires increment for every release.

---

## Orientation

`portrait` only — no landscape. Simpler form UI, consistent with mobile-first design.

---

## Splash Screen

`backgroundColor: "#FEFBF6"` matches app background for seamless perceived load time.

---

## Related
- [[config/package-json]] — SDK version must align with Expo version in app.json (`sdkVersion` implicit)
- [[config/eas-json]] — build profiles that decide which `app.json` variant to use (development/preview/production may override some keys)
- [[lib/supabase]] — reads `extra.supabaseUrl` + `extra.supabaseAnonKey`
