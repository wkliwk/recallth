# Recallth — Product Documentation

**Version:** 2.0 (Merged + Repositioned)
**Last updated:** 2026-04-11
**Codebase:** `/Users/ricky/Dev/recallth` (React + Vite — unified target)
**Production (legacy):** https://recallth-web.vercel.app (Next.js — to be sunset after merge)

---

## Overview

**What is Recallth?**
Recallth is an AI supplement advisor that knows your full health profile and remembers it across every conversation. You build your stack, ask questions, spot conflicts, and get a daily schedule — all in one place that never forgets.

**Positioning statement:**
"Your stack, finally clear." — supplement tracking that thinks alongside you.

**Who is it for:**
Health-conscious individuals (20–45) who take 3+ supplements, exercise regularly, and are tired of Googling dosing questions or losing track of what they take. Specifically: athletes, biohackers, gym-goers who want evidence-based answers specific to their stack.

**The core problem it solves:**
You explain your supplements to ChatGPT every session. You don't know if your stack has conflicts. You forget what to take when. Recallth centralises your stack and makes every answer specific to you.

**Not a medical device.** Not a replacement for a doctor. Supplements and wellness only.

---

## Design System

Source of truth: `/Users/ricky/Dev/recallth/src/index.css`

| Token | Value |
|---|---|
| `--color-orange` | `#E07B4A` — primary accent |
| `--color-orange-lt` | `#FDE8DE` — tinted backgrounds |
| `--color-orange-dk` | `#C05A28` — hover states |
| `--color-page` | `#FBF9F5` — app background |
| `--color-sand` | `#F2EDE4` — secondary surface |
| `--color-ink1` | `#2A221A` — primary text |
| `--color-ink2` | `#7A6A5A` — secondary text |
| `--color-ink3` | `#B0A898` — tertiary/placeholder |
| Font display | DM Serif Display |
| Font body | DM Sans |

All new screens must use these tokens. No zinc, no Geist, no emerald from the legacy codebase.

---

## Tech Stack (Target)

- Framework: React 19 + Vite
- Router: React Router v7
- Styling: Tailwind CSS v4 (token-based, no arbitrary values where tokens exist)
- Animation: Framer Motion
- Backend API: existing Express/TypeScript backend at `wkliwk/recallth-backend`
- Auth: JWT (email/password) + Google OAuth
- Deploy: Vercel

---

## Screen Inventory

### Screens in Vite codebase (source of truth for design)

| Screen | Route | Status | Notes |
|---|---|---|---|
| Landing | `/` | Built — keep | Wordmark animation, features, chat/cabinet preview, CTA |
| Auth | `/auth` | Built — keep | Sign up / log in tabs, Google SSO button, orange header |
| Home/Dashboard | `/home` | Built — extend | Sidebar layout, today's schedule, Ask AI card, recent chats |
| Chat | `/chat` | Built — extend | AI chat with suggestion chips, floating panel via AppShell |
| Cabinet | `/cabinet` | Built — extend | Supplement list with search, FAB to add |
| Profile | `/profile` | Built — extend | Avatar, stats, accordion sections |

### Screens in Next.js codebase (features to port)

| Feature | Route | Decision | Notes |
|---|---|---|---|
| Schedule | `/schedule` | Port — MVP | AI-optimised timing grouped by time of day |
| Stack Builder | `/stack-builder` | Port — MVP | Goal input → AI recommendations + seasonal |
| Doctor Prep | `/doctor-prep` | Port — MVP | AI generates questions for doctor visits |
| Bloodwork | `/bloodwork` | Port — Phase 2 | Manual entry with charting; good feature, not core |
| Journal | `/journal` | Port — Phase 2 | Mood/energy log with trend charts |
| Side Effects | `/side-effects` | Port — Phase 2 | Reaction timeline with AI correlation |
| History | `/history` | Port — MVP | Chat history list |
| Notifications | `/notifications` | Defer — Phase 3 | Reminder config; low priority without native push |
| Onboarding | `/onboarding` | Port — MVP | Goal wizard for new users |
| Digest | `/digest` | Defer — Phase 3 | Weekly summary; build after history is solid |
| Shared Stack | `/shared-stack` | Defer — Phase 3 | Social/sharing feature |
| Progress | `/progress` | Defer — Phase 3 | Overlaps with Journal and Bloodwork |
| Goals | `/goals` | Merge into Profile | Not a standalone screen needed |
| Health Report | `/health-report` | Defer — Phase 3 | Requires multiple data sources populated |

### Screens to build new

| Screen | Route | Notes |
|---|---|---|
| Onboarding flow | `/onboarding` | Multi-step: goals → first supplement → schedule preferences |
| Supplement detail | `/cabinet/:id` | View/edit single supplement with interaction warnings + evidence score |

---

## MVP Feature Set (Phase 1)

These are the features that must exist for launch. Everything else is Phase 2+.

### 1. Design System Implementation
Apply the orange/sand/DM Sans/DM Serif token set consistently across all screens.
All screens use AppShell (sidebar + floating chat FAB) on desktop, BottomNav on mobile.

**Acceptance criteria:**
- [ ] All screens use `--color-orange`, `--color-page`, `--color-sand`, `--color-ink*` tokens
- [ ] DM Sans body / DM Serif Display headings applied globally
- [ ] AppShell sidebar visible on screens >= 768px
- [ ] BottomNav visible on screens < 768px
- [ ] Floating AI chat FAB accessible from every authenticated screen
- [ ] No zinc, emerald, or Geist remnants in any screen

---

### 2. Authentication — `/auth`

**Description:** Email/password + Google OAuth sign up and sign in. Single screen with tab toggle.

**User flow:**
1. Visit `/` → click "Get started" → `/auth?mode=signup`
2. Enter name, email, password → submit → JWT stored → redirect to `/onboarding` (new user) or `/home` (returning)
3. Or: click "Continue with Google" → OAuth flow → same outcome
4. Login: visit `/auth?mode=login` → email + password → redirect to `/home`

**Acceptance criteria:**
- [ ] Sign up with email + password works end-to-end (calls backend API)
- [ ] Log in with email + password works end-to-end
- [ ] Google OAuth button visible; connects to backend OAuth flow
- [ ] JWT token persisted in localStorage across page refreshes
- [ ] Invalid credentials show inline error message
- [ ] Protected routes redirect unauthenticated users to `/auth?mode=login`
- [ ] Logout clears JWT and redirects to `/auth?mode=login`

---

### 3. Onboarding — `/onboarding`

**Description:** 3-step wizard for new users: (1) health goals, (2) add first supplement, (3) schedule preference.

**User flow:**
1. After first-ever sign up → `/onboarding/goals` → select 1–3 goals from preset list
2. → `/onboarding/supplement` → add first supplement (name, dose, timing)
3. → `/onboarding/schedule` → confirm preferred supplement timing window
4. → `/home` (onboarding complete flag stored on user profile)

**Acceptance criteria:**
- [ ] Step 1: User can select goals from list (muscle, recovery, sleep, energy, general health)
- [ ] Step 2: User can add at least one supplement with name, dose, timing
- [ ] Step 3: User selects preferred morning/evening timing
- [ ] Returning users skip onboarding (flag check on route)
- [ ] Progress indicator shows current step (1/3, 2/3, 3/3)
- [ ] All onboarding data saved to backend profile/cabinet APIs

---

### 4. Home / Dashboard — `/home`

**Description:** Sidebar desktop layout. Today's supplement schedule, Ask AI card, recent conversations, stats strip.

**User flow:**
User logs in → `/home` → sees today's schedule (grouped morning/pre-workout/evening), 4 stats (supplements, conflicts, streak, AI-powered), Ask AI card with quick prompts, recent conversations list.

**Acceptance criteria:**
- [ ] Today's schedule fetched from backend and rendered grouped by time window
- [ ] Stats strip: supplement count, conflict count, streak days — all real data from API
- [ ] Ask AI card: submitting a question navigates to `/chat` with prefilled message
- [ ] Quick prompts (3 suggestions) navigate to `/chat` with prompt prefilled
- [ ] Recent conversations list shows last 3 chat sessions from API
- [ ] Empty states displayed if no supplements or no conversations exist
- [ ] Schedule empty state shows "Add your first supplement" CTA

---

### 5. Supplement Cabinet — `/cabinet`

**Description:** Full list of user's supplements with CRUD operations, conflict warnings, and evidence scores.

**User flow:**
Navigate to `/cabinet` → see all supplements with name, dose, timing → tap FAB (+) to add new → fill form → save → cabinet refreshes. Tap supplement card → detail/edit view. Conflict warnings shown as banner if any exist.

**Acceptance criteria:**
- [ ] Cabinet fetched from API and rendered as card list
- [ ] Add supplement: name (required), type, dosage, frequency, timing, brand (optional), notes (optional)
- [ ] Edit supplement: tap card → edit form pre-populated
- [ ] Delete supplement: available from edit view with confirmation
- [ ] Search input filters the visible list client-side
- [ ] Conflict warning banner shown if backend returns interactions
- [ ] Evidence score badge shown per supplement (A/B/C/D)
- [ ] Empty state shown if cabinet is empty with add CTA
- [ ] FAB button opens add form

---

### 6. Supplement Detail — `/cabinet/:id`

**Description:** Single supplement view with full details, interaction check results, evidence score, edit/delete actions.

**User flow:**
From cabinet list → tap card → detail view shows full supplement info, interaction warnings with other items, evidence score with rationale, edit/delete options.

**Acceptance criteria:**
- [ ] All supplement fields displayed
- [ ] Interaction warnings listed with severity (minor/moderate/major) and explanation
- [ ] Evidence score shown with 1-sentence rationale
- [ ] Edit button opens inline edit form
- [ ] Delete button with confirmation removes item and returns to `/cabinet`

---

### 7. AI Chat — `/chat`

**Description:** Full-screen chat with Recallth AI. AI has access to user's full profile and cabinet context.

**User flow:**
Navigate to `/chat` (or via FAB from any screen) → see suggestion chips → type question or tap chip → AI responds with supplement-specific answer → conversation saved → can start new chat.

**Acceptance criteria:**
- [ ] Chat sends message to backend AI endpoint with full profile + cabinet context
- [ ] AI responses rendered as chat bubbles (user right, AI left)
- [ ] Typing indicator shown while AI is responding
- [ ] Suggestion chips shown on empty state (6 options: "My stack today", "Interactions?", "Best timing", "Add supplement", "Side effects", "What's new?")
- [ ] New chat button clears conversation
- [ ] Conversation auto-scrolls to latest message
- [ ] "Not medical advice" disclaimer shown subtly

---

### 8. Floating Chat Panel

**Description:** Global AI chat accessible from any authenticated screen via FAB button. Opens as a right-side slide-over panel (420px wide on desktop).

**User flow:**
Click orange FAB from any screen → chat panel slides in from right → full conversation capability → close button or click backdrop to dismiss.

**Acceptance criteria:**
- [ ] FAB visible on all authenticated screens (Home, Cabinet, Profile, Schedule, etc.)
- [ ] FAB hidden when panel is open
- [ ] Panel slides in from right with animation
- [ ] Panel has full chat capability (same as `/chat` screen but in panel form)
- [ ] Clicking backdrop closes panel
- [ ] Panel state (messages) preserved while navigating between screens in the same session

---

### 9. Schedule — `/schedule`

**Description:** Today's supplement schedule grouped by time of day, pulled from AI-optimised timing.

**User flow:**
Navigate to `/schedule` → see supplements grouped into time windows (morning, pre-workout, with meals, evening, before bed) → timing based on supplement absorption data and interactions.

**Acceptance criteria:**
- [ ] Schedule groups cabinet items by optimal time window from API
- [ ] Each time block shows: time label, list of supplements with dose
- [ ] Timing conflict warnings shown inline
- [ ] Empty state if cabinet is empty
- [ ] Matches the design pattern from the existing Home screen schedule blocks

---

### 10. Stack Builder — `/stack-builder`

**Description:** Enter a health goal → AI recommends a supplement stack. Shows essential/beneficial/optional tiers.

**User flow:**
Navigate to `/stack-builder` → type a goal (e.g., "better sleep", "muscle building") → AI returns recommendations in priority tiers → user can add recommended items to cabinet → seasonal recommendations also shown.

**Acceptance criteria:**
- [ ] Goal input field with submit
- [ ] Recommendations returned in tiers: essential / beneficial / optional
- [ ] Each recommendation shows: name, rationale, suggested dose
- [ ] Items already in cabinet marked "already in stack" (no duplicate adds)
- [ ] "Add to cabinet" button per recommendation calls cabinet API
- [ ] Seasonal recommendations section below goal results
- [ ] Empty state before first search

---

### 11. Doctor Prep — `/doctor-prep`

**Description:** AI generates a list of questions to ask the doctor, based on user's profile, cabinet, and interactions.

**User flow:**
Navigate to `/doctor-prep` → loading state while AI fetches profile + cabinet + interactions → list of questions grouped by topic → user can mark questions done.

**Acceptance criteria:**
- [ ] Questions generated from backend AI endpoint using profile + cabinet + interactions
- [ ] Questions grouped by topic (supplements, symptoms, goals, interactions)
- [ ] User can mark individual questions as "asked" (local state, persists session)
- [ ] Copy all questions to clipboard button
- [ ] Loading state while AI generates
- [ ] Error state if generation fails

---

### 12. Profile — `/profile`

**Description:** Health profile editing (body stats, diet, exercise, sleep, lifestyle, goals) and account management.

**User flow:**
Navigate to `/profile` → accordion sections for each profile area → tap section to expand → edit fields inline → save button per section.

**Acceptance criteria:**
- [ ] Profile data fetched from API and pre-populated
- [ ] Sections: body stats (height, weight, age), diet, exercise, sleep, lifestyle, goals
- [ ] Each section independently editable and saveable
- [ ] Changes reflected in AI responses immediately after save
- [ ] Logout button in profile clears JWT and redirects to `/auth`
- [ ] Avatar/initials shown in header

---

### 13. Chat History — `/history`

**Description:** Chronological list of past AI conversations.

**User flow:**
Navigate to `/history` → list of past conversations in reverse order → tap to expand and read → each conversation shows date and first message as preview.

**Acceptance criteria:**
- [ ] All past conversations fetched from API
- [ ] Listed in reverse chronological order
- [ ] Each row shows: date, first message preview, message count
- [ ] Tap to expand full conversation inline
- [ ] Empty state if no conversations yet
- [ ] Link to start new chat

---

## Out of Scope — MVP

These features are explicitly excluded from Phase 1. Do not build unless CEO approves:

- Notifications / reminders (no native push on web)
- Journal / mood logging
- Bloodwork tracking
- Side effects timeline
- Weekly digest
- Shared stack (social)
- Progress charts
- Health report (aggregate)
- Family member switching
- PDF export
- Proactive AI alerts
- E-commerce / supplement purchasing
- Medical diagnosis of any kind

---

## Phase 2 (After MVP Launch)

- Journal — mood/energy log with trend charts
- Bloodwork — manual entry with marker charts
- Side Effects — reaction timeline with AI correlation
- Family member profiles
- PDF profile export
- Notifications (web push or email)

## Phase 3 (Future)

- Weekly digest
- Shared stack / social features
- Apple HealthKit integration
- Native mobile app (Expo)
- Health report aggregate
