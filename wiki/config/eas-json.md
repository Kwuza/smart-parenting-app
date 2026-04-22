---
id: eas-json-001
type: config
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - eas.json
confidence: high
status: active
tags:
  - config
  - eas
  - build
  - smart-parenting-app
related:
  - config/package-json
  - config/app-json
---
# EAS Build Configuration — eas.json

**Location:** project root
**Tool:** Expo Application Services (cloud builds)
**Profiles:** `development`, `preview`, `production`

---

## Profile Summary

```json
{
  "development": {
    "distribution": "internal",
    "android": { "buildType": "apk" },
    "ios": { "simulator": true, "buildType": "app" }
  },
  "preview": {
    "distribution": "internal",
    "android": { "buildType": "apk" },
    "ios": { "simulator": false, "buildType": "app" }
  },
  "production": {
    "android": {
      "buildType": "app-bundle",
      "gradleCommand": ":app:bundleProductionRelease"
    },
    "ios": {
      "simulator": false,
      "buildType": "app-store"
    }
  }
}
```

---

## Profile Purposes

| Profile | Use |
|---------|-----|
| `development` | Local testing on emulator/simulator; APK (Android) or app (iOS simulator) |
| `preview` | Internal QA distribution (TestFlight/Internal Play); debug build with logs |
| `production` | App Store / Play Store release (AAB + IPA, minified) |

---

## Secrets

EAS secrets injected at build-time (set via `eas secret` CLI):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions only)
- `OPENROUTER_API_KEY` (Edge Functions only)

Available via `Constants.expoConfig?.extra` in app code AND via `process.env` in Edge Functions.

---

## Build Time vs Runtime

- `eas.json` profiles control **build configuration** (gradle command, simulator flag, distribution)
- Runtime config via `app.json` → `extra` section (passed to app at runtime; Expo Constants)

**Important:** Secrets in EAS are **not** auto-injected into `app.json` `extra`. `extra` values need separate `eas secret` with `--scope project` or hardcoded (not recommended). Current setup likely uses Expo Config Plugin or build hook to inject.

---

## Build History & Caching

EAS caches layers between builds. `cache` key possible in profile but not used. Node modules cached automatically.

---

## Related
- [[config/app-json]] — runtime config that complements eas.json
- [[config/tsconfig]] — affects build-time type checking
- [[lib/supabase]] — uses `Constants.expoConfig?.extra` to get keys
- [[supabase/edge-function-analyze-child]] — uses Edge Function env vars injected at deploy, not build
