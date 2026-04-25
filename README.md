# Smart Parenting App

A mobile childcare monitoring application built with Expo SDK 55 and Supabase. Track activities, view AI-generated insights, and manage your child's daily schedule — all from a single React Native codebase targeting iOS and Android.

---

## Quick Start

```powershell
# 1. Install dependencies
npm install

# 2. Set up environment variables
copy .env.example .env
# Edit .env with your Supabase URL, anon key, and OpenRouter key

# 3. Start the development server
npx expo start

# 4. Scan the QR code with Expo Go on your iPhone
#    or press 'a' to launch on an Android emulator
```

> **Windows + iOS device?** See the [Windows → iOS Developer Setup Guide](../smart-parenting-docs/developers/windows-ios-setup.md) for detailed instructions on physical device testing and EAS Build cloud compilation.

---

## Documentation

All project documentation lives in the sibling `smart-parenting-docs/` directory:

| Section | Files |
|---------|-------|
| **Getting Started** | [Quick Start](../smart-parenting-docs/getting-started/quickstart.md) · [Tech Stack](../smart-parenting-docs/getting-started/tech-stack.md) |
| **User Guide** | [Dashboard](../smart-parenting-docs/user-guide/dashboard.md) · [Activities](../smart-parenting-docs/user-guide/activities.md) · [History](../smart-parenting-docs/user-guide/history.md) · [Settings](../smart-parenting-docs/user-guide/settings.md) |
| **Features** | [AI Insights](../smart-parenting-docs/features/ai-insights.md) · [Notifications](../smart-parenting-docs/features/notifications.md) · [Scheduling](../smart-parenting-docs/features/scheduling.md) |
| **Architecture** | [Repo Structure](../smart-parenting-docs/architecture/repo-structure.md) · [Database Schema](../smart-parenting-docs/architecture/database-schema.md) · [Auth Flow](../smart-parenting-docs/architecture/auth-flow.md) · [Design System](../smart-parenting-docs/architecture/design-system.md) |
| **Developers** | [Windows iOS Setup](../smart-parenting-docs/developers/windows-ios-setup.md) · [Clean Repo Guide](../smart-parenting-docs/developers/clean-repo-guide.md) |
| **Reference** | [FAQ](../smart-parenting-docs/faq.md) · [Changelog](../smart-parenting-docs/changelog.md) · [Known Issues](./KNOWN_ISSUES.md) |

---

## Tech Stack

- **Framework:** Expo SDK 55 / React Native
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **State Management:** Zustand
- **AI Provider:** OpenRouter (`openrouter/elephant-alpha`)
- **Navigation:** Expo Router (file-based)
- **UI Components:** React Native Paper (selectively — compact inputs use plain RN TextInput)
- **Charts:** react-native-chart-kit

---

## Project Structure

```
app/
├─ (auth)/           # Auth flow (login, register, onboarding)
├─ (tabs)/           # Main tab screens (Dashboard, Log, History, AI Insights, Settings)
├─ child/            # Child picker modal & management
├─ settings/         # Settings sub-screens
├─ _layout.tsx       # Root layout with auth guard
components/           # Shared UI components (ScreenHeader, ActivityCard, etc.)
lib/
├─ api.ts            # Supabase queries, mutations, helpers
├─ store.ts          # Zustand stores (auth, child selection, UI state)
└─ notifications.ts  # Expo local notifications setup
assets/               # Fonts, images, icons
```

---

## Environment Variables

Required keys in `.env` (see `.env.example` for full template):

| Variable | Source |
|----------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API |
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |

---

## Building for Production

This project is developed on **Windows** and targets **physical iOS devices**. Native iOS compilation requires macOS/Xcode, so production builds use **EAS Build** (cloud service):

```powershell
# Configure EAS (one-time)
npx eas-cli build:configure

# Build .ipa for iOS
npx eas-cli build --platform ios --profile production
```

See the [Windows iOS Setup Guide](../smart-parenting-docs/developers/windows-ios-setup.md#step-12-eas-build-for-production) for Apple Developer account requirements, TestFlight distribution, and sideloading alternatives.

---

## Scripts

```powershell
npm start          # Start Expo development server
npm run android    # Start with Android emulator
npm run ios        # Start with iOS simulator (requires macOS)
npm run web        # Start web version
npm run lint       # Run ESLint
```

---

## Clean Repository Policy

This repository contains **source code and configuration only**. Build artifacts, secrets, and generated directories are excluded from version control. Run the verification script after cloning:

```powershell
powershell -File ..\smart-parenting-docs\developers\verify-clean.ps1
```

See [Clean Repo Guide](../smart-parenting-docs/developers/clean-repo-guide.md) for the full hygiene checklist.

---

## License

Proprietary — all rights reserved by the project owner.
