# Smart Parenting App

AI-based child activity monitoring mobile application.

## Tech Stack

- **Frontend:** React Native + Expo SDK 52
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** OpenRouter API
- **Build:** Expo EAS Build

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and OpenRouter keys

# 3. Start development
npx expo start

# 4. Build for Android
eas build --platform android --profile preview

# 5. Build for iOS
eas build --platform ios --profile preview
```

## Supabase Setup

1. Create project at https://supabase.com
2. Run the SQL schema (see `database/schema.sql`)
3. Enable Email/Password auth in Authentication settings
4. Copy URL and anon key to `.env`

## Project Structure

```
app/
├── (auth)/          # Login, Signup
├── (tabs)/          # Dashboard, Log, AI, Profile
├── child/           # Child profile screens
└── _layout.tsx      # Root layout

lib/
├── supabase.ts      # Supabase client
└── api.ts           # API functions

stores/
└── auth.ts          # Auth + app state (Zustand)
```

2-3 = 11-13 hours
4-5 = 10-12 hours

## Database Schema

See `database/schema.sql` for the full schema.

## License

Private commission — not for redistribution.
