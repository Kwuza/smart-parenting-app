---
id: package-json-001
type: entity
created: 2026-04-22
updated: 2026-04-22
source_refs:
  - package.json
confidence: high
status: active
tags:
  - config
  - package-json
  - smart-parenting-app
related:
  - config/eas-json
  - config/tsconfig
---
# package.json — Dependencies & Scripts

**Location:** project root
**Lockfile:** package-lock.json (committed)
**Node engine:** unspecified — RN 0.76+ requires Node 18+ (user runs Node 20)

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native` | 0.76.9 | Core framework |
| `expo` | ~52.0.0 | Platform tooling |
| `expo-router` | ~4.0.0 | File-based routing (like Next.js App Router) |
| `react-native-paper` | ^5.12.0 | Material Design 3 UI components |
| `@react-native-async-storage/async-storage` | ^1.21.0 | Persistent local storage (session, prefs) |
| `@supabase/supabase-js` | ^2.49.0 | Auth + PostgreSQL client |
| `zustand` | ^5.0.0 | State management |
| `react-hook-form` | ^7.54.0 | Form state + validation |
| `zod` | ^3.24.0 | Schema validation |
| `react-native-chart-kit` | ^6.12.0 | Charts (Dashboard future) |
| `date-fns` | ^4.1.0 | Date manipulation |
| `expo-notifications` | ~14.0.3 | Local scheduled notifications |
| `expo-secure-store` | ~14.0.1 | Secure credential storage (keychain/keystore) |
| `expo-keep-awake` | ~14.0.3 | Prevent screen sleep during logging |
| `expo-font` | ~13.0.4 | Custom font loading |
| `expo-asset` | ~11.0.5 | Asset bundling |
| `expo-device` | ~7.0.3 | Device info for notifications permissions |

---

## Dev Dependencies

| Package | Purpose |
|---------|---------|
| `@types/react` `@types/react-native` | TypeScript types |
| `typescript` | ^5.x |
| `eslint` `@react-native-community/eslint-config` | Linting |
| `jest` `@testing-library/react-native` | Testing (minimal coverage) |
| `expo-dev-client` | Custom dev client builds |

---

## Scripts

| Script | Runs | Purpose |
|--------|------|---------|
| `start` | `expo start` | Metro dev server |
| `android` | `expo run:android` | Build & launch Android emulator |
| `ios` | `expo run:ios` | iOS simulator |
| `web` | `expo start --web` | Web (not used) |
| `build:android` | `eas build --platform android` | Production APK/AAB |
| `build:ios` | `eas build --platform ios` | IPA |
| `lint` | `eslint .` | Lint |

---

## Expo SDK Alignment

Expo SDK version (`expo` package) must stay in sync with all `expo-*` modules. Rule (from expo docs): all `expo-*` modules should have the same major/minor version as `expo` (e.g., ~52.0.0 across board).

**Confirmed 2026-04-18:** all `expo-*` deps aligned to ~52.0.0.

---

## Breaking Changes Watchlist

- **Expo SDK 53** not yet released; upgrading will require:
  - Update `expo` + all `expo-*` modules to ~53.0.0
  - Test `expo-router` 5.x compatibility
  - Test `expo-notifications` permission changes (if any)
  - Checklist: https://blog.expo.dev/

---

## Peer Dependencies

`react-native-paper` expects React Native ≥0.70; satisfied.

---

## Missing (Not in package.json)

- `expo-sqlite` (not needed — uses Supabase)
- `expo-location` (future: geotagging activities)
- `expo-image-picker` (child photo upload — implemented but library not listed?)
  - Actually: `expo-image-picker` not explicit — maybe uses `expo-media-library`? Check code.
- `@react-native-firebase/*` — not used

---

## Related
- [[config/eas-json]] — build profiles using these deps
- [[config/app-json]] — Expo config schema delegates to package.json for SDK version check
- [[components/dashboard-screen]] — runtime dependency on react-native-paper
- [[lib/notifications-scheduler]] — imports expo-notifications module
