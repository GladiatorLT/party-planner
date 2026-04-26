# Party Planner App — Full Project Plan

> **Living document** — checkboxes track real progress. Check off items as they are completed.
> Last updated: 2025-05-14

---

## 1. What Is This App?

Party Planner is an AI-powered event planning platform for **web, iOS, and Android simultaneously** using Expo + React Native Web.
One codebase. Web runs in browser via Expo Web (Vite under the hood). iOS and Android via EAS Build. No separate React web project needed.

The AI (AWS Bedrock — Claude 3 Sonnet) guides the user through planning any event from start to finish — from a 1-year-old birthday party to a wedding — generating timelines, guest lists, invitations, menus, seating charts, entertainment suggestions, and cost breakdowns.

**First real test case: Meda's 1st Birthday — May 19, 2025, at home.**

---

## 2. Why Expo (Not Separate React Web + React Native)

From MEDA-app experience:
- Expo Web works well for testing — `npx expo start` then press `w` opens browser instantly
- One codebase = one set of components, one API layer, one auth service
- No need to maintain two separate projects
- React Native Web renders RN components as HTML — works fine for a planning app
- EAS Build handles iOS + Android production builds when ready
- Tailwind-style styling via NativeWind (works on web + native)
- Web is developed and tested first (no emulator needed), then mobile tested after

---

## 3. Lessons Learned from MEDA-app & mims-expo

### What Worked
- ✅ CDK for infrastructure — fast to iterate, easy to redeploy
- ✅ File-based Lambda functions (not inline) — no escaping nightmares
- ✅ Cognito User Pool with USER_PASSWORD_AUTH (not SRP) — instant login
- ✅ Direct fetch to Cognito API instead of amazon-cognito-identity-js SRP = instant auth
- ✅ DynamoDB for key-value — cheap, fast, no connection pooling issues
- ✅ EAS Build for iOS/Android production builds
- ✅ SES already out of sandbox on mim-online.com — use it
- ✅ Keep all screens mounted (display:none) — instant tab switching
- ✅ WebSocket with exponential backoff — don't hammer reconnects
- ✅ Expo Web for browser testing — fastest dev loop

### What Did NOT Work / Lessons
- ❌ SRP auth = 30 second login on mobile. Always use USER_PASSWORD_AUTH via direct fetch
- ❌ Template literals in CDK inline Lambda = syntax errors. Use file-based Lambdas
- ❌ `\n` in CDK inline strings breaks. Use String.fromCharCode(10) or just use files
- ❌ WebSocket reconnecting every 3s floods UI thread. Use exponential backoff
- ❌ Mounting/unmounting screens on tab switch = 3-5s delay. Keep mounted, use display:none
- ❌ 1-second timer re-renders entire tree. Use 10s intervals or refs
- ❌ console.log in render functions kills performance. Remove before testing
- ❌ Passwords in DynamoDB. Cognito handles auth entirely
- ❌ useCallback([user]) recreates WebSocket on every user state change. Use refs
- ❌ ALB costs $16/month even with zero traffic. Skip during dev, use API Gateway URL directly

### Architecture Decisions for Party Planner
- Expo monorepo — web + iOS + Android from one codebase
- No inline Lambda code — all Lambdas from files
- Separate Lambdas per domain (events, guests, ai, invitations, vendors)
- Zustand for state (no Context re-render cascades)
- React Query for server state (caching, background refetch)
- NativeWind for styling (Tailwind classes that work on web + native)
- Unit tests from day 1 — Jest + React Testing Library
- All UI interactions instant — optimistic updates

---

## 4. Tech Stack

### Frontend — Expo (Web + iOS + Android)
- **Expo SDK 54** + React Native + TypeScript
- **Expo Web** — browser testing via `npx expo start` → `w`
- **NativeWind v4** — Tailwind CSS classes on React Native components
- **Expo Router v4** — file-based routing (works on web + native)
- **Zustand** — lightweight global state, no re-render cascades
- **React Query (TanStack Query)** — server state, caching, background sync
- **Jest + React Testing Library** — unit tests from day 1
- **EAS Build** — iOS + Android production builds when ready

### Backend — AWS (CDK)
- **AWS CDK** (TypeScript) — all infrastructure as code
- **API Gateway REST** — all CRUD endpoints, Cognito authorizer
- **API Gateway WebSocket** — real-time RSVP updates
- **AWS Cognito User Pool** — USER_PASSWORD_AUTH, no SRP, no secret
- **AWS Bedrock** (Claude 3 Sonnet) — AI planning, content generation
- **AWS SES** — send invitations (domain: mim-online.com, already out of sandbox)
- **DynamoDB** — primary database (see schema)
- **S3** — invitation assets, uploaded photos
- **CloudWatch** — logs, 7-day retention
- **No ALB during dev** — use API Gateway URL directly (saves $16/month)

### Dev Environment
- `npx expo start` → press `w` for web at localhost:8081
- API Gateway URL used directly (no ALB, no proxy needed)
- `.env` file for API URL, Cognito IDs (not committed)

---

## 5. Pricing Model

### Accounts — Always Free
- Create an account: free
- No subscription, no monthly fee
- Account stores your events forever

### Per-Event Pricing
- **Free tier**: 1 event at a time, up to 20 guests, basic AI (3 AI calls per event)
- **Single event unlock**: **$4.99 one-time** — unlimited guests, full AI, invitation sending, all features
- **Bundle**: **$14.99** — 5 event credits (best value)
- **Unlimited**: **$29.99/year** — unlimited events (for power users / wedding planners)

### Why Per-Event Makes Sense
- People plan 1-3 events per year, not monthly
- Lower barrier to entry — try free, pay only when you need it
- No subscription fatigue
- App Store one-time purchases are simpler than subscriptions
- Aligns cost with value — you pay when you get value

### Cost Per Event to Us (AWS)
- ~$0.15-0.30 in Bedrock AI calls per event (20-40 AI calls)
- ~$0.01 in SES emails (50 guests)
- ~$0.00 DynamoDB/Lambda (free tier covers it)
- **Total AWS cost per event: ~$0.30**
- **Revenue per event: $4.99**
- **Gross margin per event: ~94%**

### Profitability at Scale

| Monthly Events Sold | Revenue | AWS Cost | Gross Profit | Margin |
|---|---|---|---|---|
| 100 | $499 | ~$30 | $469 | 94% |
| 500 | $2,495 | ~$150 | $2,345 | 94% |
| 1,000 | $4,990 | ~$300 | $4,690 | 94% |
| 5,000 | $24,950 | ~$1,500 | $23,450 | 94% |
| 10,000 | $49,900 | ~$3,000 | $46,900 | 94% |

**App Store fees (Apple 30%, Google 15%):**
- At 1,000 events/month × $4.99 = $4,990 → ~$750-1,500 to stores → ~$3,200-4,200 net

**Verdict: Very profitable. Bedrock scales linearly but margin stays ~94% at any scale.**

---

## 6. AWS Services & Cost

### Dev/Personal Use (Just Me)

| Service | Usage | Monthly Cost |
|---|---|---|
| DynamoDB | < 1GB, < 1M requests | **$0** (free tier) |
| Lambda | < 1M invocations | **$0** (free tier) |
| API Gateway | < 1M calls | **$0** (free tier) |
| Cognito | < 50,000 MAU | **$0** (free tier) |
| Bedrock Claude 3 Sonnet | ~50 AI calls, ~2K tokens each | ~**$0.30** |
| SES | ~50 emails | **$0** (free tier 62K/month) |
| S3 | < 5GB | **$0** (free tier) |
| CloudWatch | Minimal logs | ~**$0.50** |
| **TOTAL** | | **~$1/month** |

No ALB. No RDS. API Gateway URL used directly during dev.

---

## 7. Database Design — DynamoDB

**Why DynamoDB over PostgreSQL/RDS:**
- Free tier: 25GB + 25 WCU/RCU forever = $0 for personal use
- RDS minimum: ~$15-30/month even idle
- Aurora Serverless v2: ~$7/month minimum even with 0 traffic
- No connection pooling issues with Lambda (RDS + Lambda = connection exhaustion at scale)
- Scales to 10,000 users with zero infrastructure changes
- **Verdict: DynamoDB is the right choice for this app**

### Table: `party-planner-events`
```
PK: userId (Cognito sub)
SK: eventId (UUID)
Attributes: title, type (birthday/wedding/anniversary/graduation/custom),
            eventDate, venue, venueType (home/restaurant/venue),
            budget, guestCount, theme, status (planning/active/completed),
            aiSummary, unlocked (bool), createdAt, updatedAt
GSI1: PK=status, SK=eventDate
```

### Table: `party-planner-guests`
```
PK: eventId
SK: guestId (UUID)
Attributes: name, email, phone, rsvpStatus (pending/yes/no/maybe),
            dietaryRestrictions, plusOne, tableNumber,
            rsvpToken (unique per guest for portal link),
            invitationSentAt, rsvpAt, notes
GSI1: PK=rsvpToken (for guest portal lookup)
```

### Table: `party-planner-planning`
```
PK: eventId
SK: category#itemId  (e.g. "TIMELINE#uuid", "BUDGET#uuid", "MENU#uuid", "AI_PLAN#uuid")
Attributes: category, content (JSON), aiGenerated (bool), createdAt, updatedAt
```

### Table: `party-planner-invitations`
```
PK: eventId
SK: invitationId
Attributes: subject, htmlContent, design (JSON), sentCount, createdAt
```

### Table: `party-planner-vendors`
```
PK: eventId
SK: vendorId
Attributes: type, name, contact, price, status (inquired/booked/confirmed/cancelled),
            notes, bookingDetails
```

### Table: `party-planner-ws-connections`
```
PK: connectionId
Attributes: userId, eventId, connectedAt, ttl (24h auto-expire)
GSI1: PK=eventId (broadcast to all connections for an event)
```

---

## 8. AI Features (Bedrock — Claude 3 Sonnet)

### Onboarding Questionnaire (Conversational Chat)
Not a form — a chat interface. AI asks questions, adapts based on answers.

1. "What are we celebrating?" → detects type
2. "Tell me about the guest of honor" → age, interests
3. "How many guests?"
4. "What's your budget range?"
5. "Where are you hosting it?"
6. "Any dietary restrictions?"
7. "What vibe?" → formal/casual/themed/surprise
8. "Do you have a date?"
9. "What matters most?" → food/entertainment/decorations/photos
10. "Anything else?"

After ~8 exchanges → AI generates full event plan and sets up dashboard.

### AI Actions Per Section
| Section | AI Does |
|---|---|
| **Dashboard** | Generates event summary, theme, color palette, top priorities |
| **Timeline** | Full backwards timeline from event date, tasks with deadlines |
| **Guest List** | Suggests categories, flags dietary conflicts, estimates food needs |
| **Invitations** | Generates text (formal/casual/fun), HTML email design, personalizes per guest |
| **Menu** | Full menu + recipes + shopping list + portion calculator |
| **Entertainment** | Activity suggestions by age/budget/venue, vendor questions to ask |
| **Budget** | Breakdown by category, tracks actual vs estimated, alerts overspend |
| **Seating** | Table arrangement suggestions based on relationships |
| **Day-Of** | Minute-by-minute schedule, shareable with helpers |
| **Chat** | General assistant — ask anything about your event |

---

## 9. Screen Structure (Expo Router)

```
app/
  (auth)/
    index.tsx           → Landing / Login
    signup.tsx          → Create account
    forgot-password.tsx → Reset password
  (app)/
    dashboard.tsx       → All events overview
    events/
      new.tsx           → AI Questionnaire flow
      [id]/
        index.tsx       → Event dashboard (main hub)
        guests.tsx      → Guest list + RSVP management
        invitations.tsx → Design + send invitations
        menu.tsx        → Menu planner
        timeline.tsx    → Timeline + tasks
        budget.tsx      → Budget tracker
        entertainment.tsx → Vendor management
        seating.tsx     → Seating chart
        day-of.tsx      → Day-of schedule
        chat.tsx        → AI chat assistant
  guest/
    [token].tsx         → Guest portal (public, no login required)
  account.tsx           → Account settings
```

---

## 10. Guest Portal

Guests receive a unique link in their invitation email: `https://app.com/guest/{token}`

**Guests can see (admin configures what's visible):**
- Event details (date, time, location + map link)
- Their personal invitation design
- RSVP button (Yes / No / Maybe + dietary info + plus-one)
- Menu (toggle on/off)
- Agenda/schedule (toggle on/off)
- Confirmed guest list (toggle on/off — privacy)
- Photo gallery after event

**Guests cannot see:**
- Budget
- Vendor details / prices
- Other guests' contact info
- Admin planning notes
- Any other event's data

---

## 11. UI/UX Principles

- **All screens stay mounted** — display:none not unmount. Tab switching = instant (MEDA-app lesson)
- **Optimistic updates** — update UI immediately, sync to API in background
- **No SRP auth** — direct fetch to Cognito API with USER_PASSWORD_AUTH (MEDA-app lesson)
- **No console.log in render** — kills performance (MEDA-app lesson)
- **Zustand** — no Context re-render cascades
- **React Query** — automatic caching, no manual loading states
- **NativeWind** — Tailwind classes, consistent on web + native
- **Skeleton loaders** — never blank screens
- **Error boundaries** — never white screen of death
- **WebSocket exponential backoff** — 3s → 6s → 12s → 60s cap (MEDA-app lesson)
- **AI responses streamed** — show tokens as they arrive, don't wait for full response

---

## 12. Unit Testing Strategy

Jest + React Testing Library from day 1.

### Test Structure
```
src/
  components/
    GuestList/
      GuestList.tsx
      GuestList.test.tsx
  hooks/
    useEvent.ts
    useEvent.test.ts
  services/
    api.ts
    api.test.ts
    ai.ts
    ai.test.ts
```

### Coverage Targets
- Components: 80%+
- Services/hooks: 90%+
- `jest --watch` runs on every save in dev
- Tests must pass before any CDK deploy

---

## 13. Security

- No ALB during dev — API Gateway URL used directly
- Cognito: USER_PASSWORD_AUTH only, no implicit grant, no client secret
- API Gateway: Cognito authorizer on all routes except `/rsvp/{token}`
- Guest tokens: UUID stored in DynamoDB, looked up on each request
- S3: private bucket, presigned URLs only
- Lambda: least-privilege IAM per function
- Bedrock: only `bedrock:InvokeModel` permission on AI Lambda
- SES: only send from verified domain (mim-online.com)
- DynamoDB: IAM-only access, no public endpoint

---

## 14. Project Directory Structure

```
party-planner/
  PROJECT.md                        ← this file (living document)
  aws-backend/
    bin/
      app.ts                        ← CDK entry point
    lib/
      party-planner-stack.ts        ← main CDK stack
    lambdas/
      events/index.ts               ← CRUD for events + planning
      guests/index.ts               ← CRUD for guests + RSVP
      ai/index.ts                   ← Bedrock calls
      invitations/index.ts          ← generate + SES send
      vendors/index.ts              ← vendor management
      websocket/
        connect.ts
        disconnect.ts
    cdk.json
    tsconfig.json
    package.json
  mobile/                           ← Expo project (web + iOS + Android)
    app/                            ← Expo Router screens
      (auth)/
      (app)/
      guest/
    src/
      components/
      hooks/
      services/
        api.ts                      ← API calls
        auth.ts                     ← Cognito auth (USER_PASSWORD_AUTH via fetch)
      store/                        ← Zustand stores
      types/
    assets/
    app.json
    eas.json
    package.json
    tailwind.config.js
```

---

## 15. Development Progress

### ✅ Phase 0 — Planning & Architecture
- [x] PROJECT.md created
- [x] Directory structure created
- [x] CDK stack defined (Cognito, DynamoDB, Lambda, API Gateway, WebSocket, S3, SES)
- [x] Lambda handlers written (events, guests, ai, invitations, vendors, websocket)
- [x] Pricing model decided: per-event, accounts free

### ✅ Phase 1 — Backend Deploy
- [x] `npm install` in aws-backend
- [x] `npx cdk bootstrap` (if not already done)
- [x] `npx cdk deploy` — deployed successfully (87s)
- [x] Outputs recorded:
  - API URL: `https://smdjwvwwb0.execute-api.us-east-1.amazonaws.com/prod/`
  - WS URL: `wss://8tndqfawjd.execute-api.us-east-1.amazonaws.com/prod`
  - Cognito User Pool ID: `us-east-1_gtagInyk4`
  - Cognito Client ID: `60qkn54src8c0q1m2d476c3vnv`
  - S3 Bucket: `party-planner-assets-522814737649`
- [x] Fixed: SES email changed from noreply@ to contact@mim-online.com (verified identity)

### ✅ Phase 2 — Expo App Setup
- [x] `npx create-expo-app mobile --template blank-typescript`
- [x] Installed: expo-router, NativeWind, Zustand, React Query, AsyncStorage, react-native-web
- [x] `.env` configured with API URL + Cognito IDs
- [x] `src/services/auth.ts` — Cognito USER_PASSWORD_AUTH via direct fetch (no SRP)
- [x] `src/services/api.ts` — all backend API calls
- [x] `src/store/authStore.ts` — Zustand auth store with AsyncStorage persistence
- [x] `app/_layout.tsx` — root layout with React Query
- [x] `app/index.tsx` — root redirect based on auth state
- [x] `app/(auth)/login.tsx` — dark theme login + password visibility toggle
- [x] `app/(auth)/signup.tsx` — signup + email verification + password visibility
- [x] `app/(app)/dashboard.tsx` — dark theme events list with empty state
- [x] `app/(app)/account.tsx` — account screen with logout
- [x] `app/(app)/events/new.tsx` — AI questionnaire chat screen
- [x] `src/theme.ts` — dark futuristic blue theme
- [x] CORS fixed — API Gateway allows all origins
- [x] Tested in browser — login, signup, dashboard working

### ✅ Phase 3 — Core Features (Web First)
- [x] AI Questionnaire chat flow
- [x] `forgot-password.tsx` screen
- [x] Event hub screen (`/events/[id]` — AI summary, section grid, delete)
- [x] Timeline + tasks (AI generated, checkable)
- [x] Guest list + add/delete + RSVP tracking
- [x] Menu planner (AI generated + shopping list)
- [x] Budget tracker (AI generated, track actual vs estimated)
- [x] Invitations (AI generated HTML, send via SES)
- [x] AI Chat per event (persistent assistant)
- [x] RSVP guest portal (public `/guest/[token]` route)
- [x] EventHeader component with tab navigation across all event screens

### 🔲 Phase 4 — Polish & Mobile Testing
- [ ] Entertainment/vendor management
- [ ] Seating chart
- [ ] Day-of schedule
- [x] EAS project created: @gladiatorlt/party-planner (ID: 016f10ee-7b87-4102-a9c7-d4986617d986)
- [x] EAS env vars set for preview + production environments
- [x] .npmrc added with legacy-peer-deps for EAS build servers
- [x] eas.json configured: preview=APK internal, production=AAB Play Store
- [ ] EAS Build — Android preview APK → direct install (build: 5edd8e57 in progress)
- [ ] Test on Android device — login, create event, AI questionnaire
- [ ] EAS Build — Android production AAB → Play Store internal track
- [ ] Set up Google Play Console + service account for eas submit
- [ ] EAS Build — iOS production build → TestFlight

### 🔲 Phase 5 — Product (Future)
- [ ] Payment integration (Stripe or RevenueCat for in-app purchases)
- [ ] App Store submission (iOS)
- [ ] Google Play submission (Android)
- [ ] Custom domain + CloudFront
- [ ] Analytics (Amplitude or PostHog)
- [ ] Multi-user event sharing (co-planners)

---

## 16. Meda's 1st Birthday — Immediate Test Case

**Event:** Meda's 1st Birthday
**Date:** May 19, 2025
**Venue:** Home
**Time to plan:** ~1 week

AI will generate:
- Theme suggestions (animals, garden party, pastel rainbow, etc.)
- Home decoration ideas with budget breakdown
- Baby-safe menu + adult food + cake ideas
- Entertainment: bubble machine, soft play mat, photo booth corner, adult games
- Timeline: 3 weeks out → 1 week out → day before → day of
- Invitation: cute baby theme HTML email, sent via SES to family
- Shopping list from menu
- Task checklist with deadlines

**This is the first real end-to-end test of the app.**
