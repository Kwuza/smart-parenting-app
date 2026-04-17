# Smart Parenting App — Project Scope & Agreement

**Developer:** x1n4te
**Client:** [Friend's Name]
**Date:** April 12, 2026
**Total Cost:** ₱12,000 PHP

---

## 1. Project Overview

AI-based child activity monitoring mobile application. Parents log daily activities (screen time, sleep, naps, meals, physical activity, education) for their children and receive AI-powered parenting recommendations based on activity patterns.

**Platforms:** Android (primary), iOS (compatible)
**Tech Stack:**
- React Native + Expo SDK 52
- Supabase (Authentication + PostgreSQL database)
- OpenRouter API (AI recommendations)
- React Native Paper (Material Design 3 UI)

---

## 2. What's Included

### Screens (5 total)
| Screen | Description |
|---|---|
| Login / Signup | Email + password authentication |
| Dashboard | Today's activity stats, child picker, recent activity feed |
| Log Activity | Log 6 activity types with duration, quality, and type-specific details |
| AI Insights | AI-generated recommendations filtered by category and priority |
| Settings | Child profile management, add/edit children, sign out |

### Features
- Multi-child support (add, manage, switch between children)
- 6 activity types: Screen Time, Sleep, Nap, Meals, Physical Activity, Education
- Activity quality tracking (poor / fair / good)
- Device tracking for screen time (phone, tablet, TV, PC)
- Meal logging with food group categories
- Physical activity type selection
- Education subject tracking
- AI recommendations based on 7-day activity analysis
- Priority-based recommendation filtering (high / medium / low)
- Secure data: Row Level Security ensures parents only see their own children's data

### Technical Deliverables
- Complete React Native source code
- Supabase database schema (SQL) with RLS policies
- EAS Android APK build (preview/internal distribution)
- `.env.example` with setup instructions
- Basic `README.md` with run instructions

---

## 3. What's NOT Included

| Item | Why |
|---|---|
| Push notifications | Requires Firebase Cloud Messaging setup + ongoing cost |
| Offline mode | Adds significant complexity; requires local DB sync |
| App Store / Play Store submission | Requires developer accounts ($25 Google, $99 Apple/year) |
| Custom backend server | Supabase handles all backend needs |
| User-to-user features | Single-parent, single-family design |
| Data export / reports | Not in initial scope |
| Custom domain / hosting | Supabase free tier is sufficient |
| Ongoing maintenance after handover | See Maintenance Terms below |

---

## 4. Milestone Breakdown

### Milestone 1 — Core App (₱5,000)
**Status:** In Progress
**Due:** [Date]

- [x] Project setup (Expo, Supabase, dependencies)
- [x] Authentication (login, signup, session persistence)
- [x] Database schema with RLS policies
- [x] Dashboard screen with today's stats
- [x] Activity logging screen (6 types)
- [x] Child profile management (add, list)
- [x] Zustand state management
- [x] Material Design 3 UI theme

**Payment due:** Upon demonstration of Milestone 1 features working on device

### Milestone 2 — AI & Polish (₱4,000)
**Status:** Pending
**Due:** [Date]

- [ ] AI recommendations screen (OpenRouter integration)
- [ ] Edge Function for child activity analysis
- [ ] Recommendation filtering and priority display
- [ ] Settings screen finalization
- [ ] UI polish, animations, error handling
- [ ] Edge case handling (empty states, loading states, error states)

**Payment due:** Upon demonstration of Milestone 2 features working on device

### Milestone 3 — Delivery & Handover (₱3,000)
**Status:** Pending
**Due:** [Date]

- [ ] Final APK build (EAS preview)
- [ ] Supabase project transfer / owner invite
- [ ] Handover documentation
- [ ] 30-minute walkthrough call
- [ ] 2-week bug-fix window begins

**Payment due:** Upon delivery of APK + documentation

---

## 5. Payment Terms

| Event | Amount | When |
|---|---|---|
| Milestone 1 demo | ₱5,000 | After M1 walkthrough |
| Milestone 2 demo | ₱4,000 | After M2 walkthrough |
| Final handover | ₱3,000 | After APK + docs delivered |

**Payment method:** [GCash / Maya / Bank Transfer — specify]

**Late payment:** Development pauses if payment is more than 7 days overdue.

---

## 6. Handover Checklist

Upon final payment, the following will be delivered:

### Files
- [ ] `smart-parenting-app/` — complete source code directory
- [ ] `database/schema.sql` — full database schema
- [ ] `database/migration_add_activity_types.sql` — migration file
- [ ] `.env.example` — environment variable template
- [ ] `README.md` — setup and run instructions
- [ ] `app.apk` — Android APK build

### Account Access
- [ ] Supabase project invite (Owner or Admin role)
- [ ] EAS project transfer (if client wants to self-build)

### Walkthrough (30 minutes)
- [ ] How to run the app locally (`npx expo start`)
- [ ] How to rebuild the APK (`eas build --platform android --profile preview`)
- [ ] How to access Supabase dashboard
- [ ] How to view/edit the database
- [ ] How to update environment variables
- [ ] Where AI recommendations come from (OpenRouter)

### Client Responsibilities After Handover
- [ ] Create own Supabase account (or accept project transfer)
- [ ] Create own OpenRouter account for AI API key
- [ ] Set up own EAS account if future builds needed
- [ ] Review and update `.env` with own API keys

---

## 7. Maintenance Terms

### Included (free)
- Bug fixes for **2 weeks** after final delivery
- Bugs defined as: app crashes, features not working as demonstrated
- Response time: within 48 hours on weekdays

### NOT Included
- New features or screen additions
- Design changes after final approval
- Issues caused by third-party service changes (Supabase, OpenRouter, Expo)
- Device-specific issues on devices not tested during development
- Server costs (Supabase free tier covers expected usage)

### Post-Handover Support (optional, paid)
| Service | Rate |
|---|---|
| Bug fix (after 2-week window) | ₱500 / fix |
| New feature | ₱1,500–3,000 depending on scope |
| APK rebuild | ₱500 / build |
| Consultation call | ₱300 / 30 min |

---

## 8. Hosting & Ongoing Costs

| Service | Cost | Who Pays |
|---|---|---|
| Supabase (Free tier) | $0/month | Client (after transfer) |
| OpenRouter (Free models) | $0/month | Client (after handover) |
| Expo EAS (Free tier) | $0/month | Client (if rebuilding) |
| Google Play Developer | $25 one-time | Client (if publishing) |

**Expected monthly cost after handover: ₱0** (free tiers are sufficient for personal use)

---

## 9. Communication

- **Primary channel:** [Telegram / Messenger — specify]
- **Progress updates:** After each milestone demo
- **Response time:** 24-48 hours on weekdays

---

## 10. Agreement

By proceeding with the downpayment, both parties agree to the scope, milestones, and terms outlined in this document.

**Developer:** x1n4te
**Client:** ___________________
**Date:** ___________________
**Signature (acknowledgment via chat message counts):** ___________________
