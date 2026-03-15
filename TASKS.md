# AdOps Frontend — Implementation Task List

Base URL: `http://localhost:8081`
Frontend: React 19 + TypeScript + Vite + Tailwind CSS

> **Convention**: Strike through completed tasks with `~~text~~` and check the box `[x]`.
> Tasks are grouped by feature area. Work top-to-bottom — foundation first.

---

## Roadmap

| Phase | Area | Status |
|-------|------|--------|
| [Phase 1](#phase-1--foundation--api-layer) | Foundation & API Layer | **done** |
| [Phase 2](#phase-2--authentication) | Authentication | **done** |
| [Phase 3](#phase-3--global-state--brand-context) | Global State & Brand Context | **done** |
| [Phase 4](#phase-4--topbar--brand-switcher) | Topbar & Brand Switcher | **done** |
| [Phase 5](#phase-5--dashboard-page) | Dashboard Page | **done** |
| [Phase 6](#phase-6--ads-performance-page) | Ads Performance Page | **done** |
| [Phase 7](#phase-7--automations-page) | Automations Page | **done** |
| [Phase 8](#phase-8--alerts-page) | Alerts Page | **done** |
| [Phase 9](#phase-9--settings-page) | Settings Page | **done** |
| [Phase 10](#phase-10--bug-fixes--polish) | Bug Fixes & Polish | **done** |
| [Phase 11](#phase-11--plan-b-oauth-overhaul--onboarding) | Plan B: OAuth Overhaul & Onboarding | **done** |

---

## Phase 1 — Foundation & API Layer

> Everything else depends on this. Build once, use everywhere.

- [x] ~~Create `src/lib/api.ts` — base fetch wrapper~~
  - ~~Reads `access_token` from localStorage on every call~~
  - ~~Automatically attaches `Authorization: Bearer <token>` header~~
  - ~~On `401` response: calls `POST /auth/refresh` with stored `refresh_token`, retries original request once~~
  - ~~On second `401` (refresh failed): clears tokens and redirects to `/login`~~
  - ~~Exports typed helpers: `get<T>`, `post<T>`, `put<T>`, `del<T>`~~
- [x] ~~Create `src/lib/types.ts` — shared TypeScript interfaces matching API response shapes~~
  - ~~`AuthUser`, `TokenPair`, `Brand`, `BrandMember`~~
  - ~~`Campaign`, `AdSet`, `Ad`, `MetaConnection`, `MetaAdAccount`~~
  - ~~`DailyMetric`, `MetricEntityType`~~
  - ~~`AutomationRule`, `AlertHistory`, `NotificationSettings`~~
  - ~~`CreateRulePayload`, `UpdateRulePayload`, `ApiError`~~
- [x] ~~Create `.env` with `VITE_API_BASE_URL=http://localhost:8081`~~
- [x] ~~Add `.env` to `.gitignore`~~

---

## Phase 2 — Authentication

> Gate the entire app behind login. All pages except `/login` and `/register` require a valid token.

- [x] ~~Create `src/context/AuthContext.tsx`~~
  - ~~State: `user: AuthUser | null`, `isLoading: boolean`, `error: string | null`~~
  - ~~On mount: call `GET /auth/me` with stored token to rehydrate session~~
  - ~~Exposes: `login(email, password)`, `register(name, email, password)`, `logout()`~~
  - ~~`login` stores tokens in localStorage, sets `user`~~
  - ~~`logout` clears localStorage, resets `user`, redirects to `/login`~~
  - ~~Listens for `adops:logout` event from `api.ts` for forced logout on token refresh failure~~
- [x] ~~Create `src/pages/Login.tsx`~~
  - ~~Email + password form, error banner, loading state~~
  - ~~Redirects to `/` on success, link to `/register`~~
- [x] ~~Create `src/pages/Register.tsx`~~
  - ~~Name + email + password form, 8-char minimum validation~~
  - ~~Redirects to `/` on success, link to `/login`~~
- [x] ~~Create `src/components/ProtectedRoute.tsx`~~
  - ~~Shows loading spinner while rehydrating; redirects to `/login` if unauthenticated~~
- [x] ~~Update `src/App.tsx`~~
  - ~~Wrapped in `AuthProvider`~~
  - ~~`/login` and `/register` routes outside Layout (no sidebar)~~
  - ~~All app routes wrapped in `ProtectedRoute` + `Layout`~~

---

## Phase 3 — Global State & Brand Context

> All data pages need to know: which brand is active + what date range is selected.

- [x] ~~Create `src/context/BrandContext.tsx`~~
  - ~~State: `brands`, `activeBrand`, `dateRange` (`{ since, until }` YYYY-MM-DD), `isLoading`~~
  - ~~On mount: fetch `GET /brands`; auto-selects first brand~~
  - ~~Exposes: `setActiveBrand`, `setDateRange`, `refetchBrands`~~
  - ~~Mounted inside `ProtectedRoute` in `App.tsx` — always has a valid token~~
  - ~~Default date range: last 7 days using dayjs~~

---

## Phase 4 — Topbar & Brand Switcher

> Replace all hardcoded mock data in `Topbar.tsx`.

- [x] ~~Connect brand dropdown to `BrandContext.brands`~~
  - ~~Real brand names from API; active brand highlighted in blue~~
  - ~~Framer Motion animated dropdown; closes on outside click~~
- [x] ~~Implement functional date range picker~~
  - ~~3 presets: Last 7 / 14 / 30 days~~
  - ~~Custom from/to date inputs with min/max validation~~
  - ~~dayjs formatting; calls `setDateRange` on change~~
- [x] ~~Show real last-sync timestamp~~
  - ~~Fetches `GET /integrations/meta/connection?brand_id=X`~~
  - ~~Displays `synced_at` as "Synced X min ago" via dayjs `relativeTime`~~
- [x] ~~Add "Sync Now" button~~
  - ~~Calls `POST /integrations/meta/sync?brand_id=X`; spinning icon while in-flight~~
  - ~~Re-fetches connection status 3 s after sync to update timestamp~~
  - ~~Shows "Sync failed" on error~~
- [x] ~~Add logout button to Topbar~~
  - ~~Calls `AuthContext.logout()`; red hover state~~

---

## Phase 5 — Dashboard Page

> Replace all mock KPI cards and campaign table with real API data.

- [x] ~~Fetch metrics from `GET /ad-metrics?brand_id=X&since=...&until=...`~~
  - ~~Aggregate across all campaigns: total spend, total purchases, total revenue~~
  - ~~Compute Average CPP: `total_spend / total_purchases`~~
- [x] ~~Fetch campaigns from `GET /integrations/meta/campaigns?brand_id=X`~~
  - ~~Count `ACTIVE` campaigns for "Active Campaigns" KPI card~~
  - ~~Show campaign list in table with name, status~~
- [x] ~~Join metrics to campaign table~~
  - ~~For each campaign: look up its metrics from `DailyMetric` by `entity_type=campaign` + `entity_id`~~
  - ~~Show spend, purchases, CPP per campaign row~~
- [x] ~~Add loading skeleton while fetching~~
- [x] ~~Add empty state when no brand connected or no data~~

---

## Phase 6 — Ads Performance Page

> Replace mock tree data with real Campaign → AdSet → Ad hierarchy + live metrics.

- [x] ~~Fetch campaigns from `GET /integrations/meta/campaigns?brand_id=X`~~
  - ~~Replace hardcoded `data` array~~
- [x] ~~On campaign expand: fetch `GET /integrations/meta/campaigns/{metaCampaignId}/adsets`~~
  - ~~Load ad sets lazily when row is first expanded (cache result)~~
- [x] ~~On adset expand: fetch `GET /integrations/meta/adsets/{metaAdsetId}/ads`~~
  - ~~Load ads lazily when row is first expanded (cache result)~~
- [x] ~~Fetch and display metrics for each entity~~
  - ~~Use `GET /ad-metrics?brand_id=X&entity_type=campaign&entity_id=X&since=...&until=...`~~
  - ~~Show spend, purchases, CPP per row (campaign / adset / ad level)~~
- [x] ~~Add pause/enable toggle per campaign row~~
  - ~~Pause: `POST /integrations/meta/campaigns/{id}/pause?brand_id=X`~~
  - ~~Enable: `POST /integrations/meta/campaigns/{id}/enable?brand_id=X`~~
  - ~~Optimistic UI update; revert on error~~
- [x] ~~Add pause/enable toggle per adset row~~
  - ~~Pause: `POST /integrations/meta/adsets/{id}/pause?brand_id=X`~~
  - ~~Enable: `POST /integrations/meta/adsets/{id}/enable?brand_id=X`~~
- [x] ~~Fix React key warning — move `key` prop from fragment `<>` to outer `<tr>` wrapper~~
- [x] ~~Add loading state per level (campaign/adset/ad)~~
- [x] ~~Add empty state when no campaigns synced yet~~

---

## Phase 7 — Automations Page

> Replace the single hardcoded checkbox with full rule CRUD UI.

- [x] ~~Fetch rules from `GET /automation/rules?brand_id=X` on page load~~
- [x] ~~Display rules list — each row shows:~~
  - ~~Rule name, metric, condition, threshold, action, severity, active/inactive badge~~
  - ~~Toggle to enable/disable (`PUT /automation/rules/{id}` with `{ "is_active": bool }`)~~
  - ~~Delete button (`DELETE /automation/rules/{id}`)~~
- [x] ~~Add "Create Rule" button/form~~
  - ~~Fields: name, metric (dropdown), condition (dropdown), threshold (number), action (dropdown), severity (dropdown)~~
  - ~~Submit calls `POST /automation/rules?brand_id=X`~~
  - ~~Valid metric values: `roas`, `cpa`, `cpc`, `ctr`, `cpm`, `spend`, `impressions`, `clicks`, `purchases`~~
  - ~~Valid conditions: `greater_than`, `less_than`, `equals`~~
  - ~~Valid actions: `alert`, `pause_campaign`, `pause_adset`~~
  - ~~Valid severities: `info`, `warning`, `critical`~~
- [x] ~~Edit rule — inline edit or modal (`PUT /automation/rules/{id}`)~~
- [x] ~~Add loading and empty states~~

---

## Phase 8 — Alerts Page

> Replace mock alert array with real alert history from API.

- [x] ~~Fetch alert history from `GET /automation/alerts?brand_id=X`~~
  - ~~Returns last 200 entries, newest first~~
- [x] ~~Display each alert with:~~
  - ~~`entity_name` + `rule_name` as the main text~~
  - ~~`triggered_at` formatted as relative time (dayjs "X min ago / X hours ago")~~
  - ~~`severity` mapped to Badge type: `critical → danger`, `warning → warning`, `info → info`~~
  - ~~`actual_value` and `threshold` shown in detail~~
- [x] ~~Add loading state~~
- [x] ~~Add empty state when no alerts yet~~

---

## Phase 9 — Settings Page

> Wire notification toggles and CPP threshold to real API. Add Meta connection management.

- [x] ~~**Notification Settings section**~~
  - ~~Fetch `GET /automation/notifications?brand_id=X` on load~~
  - ~~Show Telegram toggle bound to `telegram_enabled`~~
  - ~~Show Telegram Chat ID input field (bound to `telegram_chat_id`)~~
  - ~~Remove WhatsApp toggle (not supported in backend)~~
  - ~~Save button calls `PUT /automation/notifications?brand_id=X`~~
  - ~~Show success/error toast on save~~
- [x] ~~**Meta Connection section**~~
  - ~~Fetch `GET /integrations/meta/connection?brand_id=X`~~
  - ~~If connected: show ad account ID, connection date, "Disconnect" button~~
    - ~~Disconnect: `DELETE /integrations/meta/disconnect?brand_id=X`~~
  - ~~If not connected: show "Connect Meta Ads" button~~
    - ~~Calls `GET /integrations/meta/connect?brand_id=X`~~
    - ~~Redirects user to returned OAuth URL~~
    - ~~After OAuth redirect back (handle `?code=...` in URL): call `GET /integrations/meta/callback?brand_id=X&code=...&ad_account_id=...`~~
- [x] ~~**CPP Threshold** — `CppThresholdSection` in `Settings.tsx`; creates/updates automation rule `name="CPP Threshold Alert"`, `metric=cpa`, `condition=greater_than`, `action=alert`~~

---

## Phase 10 — Bug Fixes & Polish

- [x] ~~**Ads.tsx key warning** — `key` prop is on `<>` fragment, move to wrapping element~~
- [x] ~~**Settings WhatsApp** — remove WhatsApp toggle (backend has no WhatsApp support)~~
- [x] ~~**Sidebar active state** — Dashboard and Ads Performance both use `/` icon (BarChart2), give Dashboard a distinct icon (`LayoutDashboard`); added `end` prop to fix `/` matching all routes~~
- [x] ~~**Global error boundary** — `src/components/ErrorBoundary.tsx`; wraps root app in `App.tsx`; shows error message + Try Again / Reload buttons~~
- [x] ~~**Toast/notification system** — `src/context/ToastContext.tsx`; `useToast()` hook; auto-dismiss after 3.5 s; slide-in animation; used in Settings.tsx for all mutations~~
- [x] ~~**Loading states** — consistent skeleton loaders across all pages~~
- [x] ~~**Empty states** — proper empty state UI when no data or no brand connected~~
- [x] ~~**CORS** — backend CORS middleware added, `CORS_ALLOWED_ORIGIN=http://localhost:5173`~~
- [x] ~~**Environment variable** — `VITE_API_BASE_URL` in `.env`, read via `import.meta.env`~~

---

## Phase 11 — Plan B: OAuth Overhaul & Onboarding

> Addresses critical flaws discovered in the original single-step OAuth design.
> See [Known Flaws](#known-flaws--post-mortems) section for root cause analysis.

- [x] ~~**Fix `META_REDIRECT_URI`** — changed from `http://localhost:8080/integrations/meta/callback` (backend) to `http://localhost:5173/meta/callback` (frontend)~~
  - ~~Root cause: Meta redirects the user's browser, not the server. Must point to the frontend.~~
  - ~~Also register `http://localhost:5173/meta/callback` in Meta App Dashboard → Facebook Login → Valid OAuth Redirect URIs~~
- [x] ~~**2-phase OAuth backend** — added `GET /integrations/meta/exchange` endpoint~~
  - ~~Phase 1: exchanges code → caches access token in-memory (`sync.Map`, 10 min TTL, UUID key) → returns `{temp_key, accounts[]}`~~
  - ~~Phase 2: `GET /integrations/meta/callback?temp_key=...&ad_account_id=...` finalizes with selected account~~
  - ~~Added `ExchangeAndListAccounts()`, `FinalizeConnection()`, `saveConnection()` to `service.go`~~
  - ~~Added `ErrTempTokenExpired` sentinel error (returns HTTP 422 so frontend knows to restart flow)~~
  - ~~Background goroutine evicts stale tokens every 5 minutes~~
- [x] ~~**Rewrite `MetaCallback.tsx`** — implements the 2-phase flow~~
  - ~~Phase 1 auto-fires on mount: calls `/integrations/meta/exchange?code=...` → shows account picker~~
  - ~~`useRef` guard prevents double-firing in React Strict Mode~~
  - ~~Loading → account list → finalize → success redirect to Settings~~
  - ~~Manual entry fallback when Meta returns no ad accounts~~
- [x] ~~**Onboarding wizard** — `src/components/Onboarding.tsx`~~
  - ~~Multi-step modal overlay: Welcome → Create Brand → Connect Meta → Done~~
  - ~~`OnboardingGate` wrapper in `App.tsx` checks after BrandProvider loads~~
  - ~~Triggers when: no brands exist (Step 1) OR brand exists but no Meta connection (Step 2)~~
  - ~~Skipped on `/meta/callback` to avoid interfering with OAuth~~
  - ~~Dismissible from Step 2 onward ("Skip for now")~~

---

## Known Flaws & Post-Mortems

> Tracked here so future developers understand why the architecture changed.

### Flaw 1 — Wrong `META_REDIRECT_URI` (Original Design)

| | |
|-|-|
| **Symptom** | OAuth returned "Feature Unavailable" or Meta redirected to a dead backend URL |
| **Root cause** | `META_REDIRECT_URI` was set to `http://localhost:8080/integrations/meta/callback` (the Go backend). Meta redirects the **user's browser**, not the server — the backend cannot receive that redirect. |
| **Fix** | Set `META_REDIRECT_URI=http://localhost:5173/meta/callback` and register that URL in Meta App Dashboard → Facebook Login → Valid OAuth Redirect URIs |
| **File** | `adOps-backend/.env` |

---

### Flaw 2 — "Feature Unavailable" from Facebook Login

| | |
|-|-|
| **Symptom** | Meta shows "Feature Unavailable" when a user tries to log in |
| **Root cause** | The Meta App is in **Development mode**. Only users explicitly added as Developers or Testers in the Meta App Dashboard can authenticate. |
| **Fix** | Go to Meta App Dashboard → App Roles → Roles → Add the Facebook account as Developer or Tester. For production: submit the app for Meta review and switch to Live mode. |
| **File** | Meta App Dashboard (external) |

---

### Flaw 3 — Chicken-and-Egg: Can't List Ad Accounts Before Connecting

| | |
|-|-|
| **Symptom** | `GET /integrations/meta/accounts` requires an existing active `MetaConnection` (a stored access token). But to create the connection you need to pick an ad account first. The original flow was stuck. |
| **Root cause** | `ListAdAccounts()` in `service.go` called `GetConnection()` which returned `ErrNoConnection` for new users. The frontend had no endpoint to exchange a code without committing to an ad account. |
| **Fix** | 2-phase flow: Phase 1 (`/exchange`) exchanges the code, caches the token in-memory, returns the account list. Phase 2 (`/callback?temp_key=...`) finalizes with the selected account. The database is only written in Phase 2. |
| **Files** | `adOps-backend/src/meta/service.go`, `adOps-backend/src/meta/handler.go`, `adOps-frontend/src/pages/MetaCallback.tsx` |

---

### Flaw 4 — No First-Run UX (Users Left with Empty Dashboard)

| | |
|-|-|
| **Symptom** | New users who register see an empty dashboard with no guidance on what to do next |
| **Root cause** | The app had no detection for "no brands" or "no Meta connection" states to guide the user |
| **Fix** | `OnboardingGate` component in `App.tsx` checks after `BrandProvider` loads whether the user needs setup. Renders the `Onboarding` wizard overlay with step-by-step guidance. |
| **File** | `adOps-frontend/src/App.tsx`, `adOps-frontend/src/components/Onboarding.tsx` |

---

## Phase 12 — UI Enhancements & Performance Improvements

> Improve UI to match Meta's design and add performance optimizations.

- [x] ~~Update Ads page with type labels (Campaign/Ad Set/Ad)~~
- [x] ~~Add color-coded badges for each entity type~~
- [x] ~~Add additional metric columns (Impressions, Reach, Clicks)~~
- [x] ~~Update column headers to match Meta's terminology~~
- [x] ~~Add "Today" date preset~~
- [x] ~~Add "Yesterday" date preset~~
- [ ] Implement background polling for sync status:
  - [ ] Poll `/integrations/meta/connection` every 30 seconds
  - [ ] Update UI when new data is available
  - [ ] Show "Data refreshing..." indicator
- [ ] Update reach metric to use actual backend data (once implemented)
- [ ] Add loading skeleton for new columns
- [ ] Test performance with large datasets (100+ campaigns)

---

## Phase 13 — Data Visualization & Advanced Features

> Add charts and advanced data visualization capabilities.

- [ ] Add chart library (e.g., recharts or visx)
- [ ] Create spend trend chart for Dashboard
- [ ] Create performance comparison charts
- [ ] Add sortable columns to Ads table
- [ ] Add column visibility toggle
- [ ] Add export to CSV functionality
- [ ] Add campaign/adset search and filtering
- [ ] Add bulk pause/enable for selected campaigns
- [ ] Add keyboard shortcuts for common actions

---

## Notes

- No external HTTP library needed — use native `fetch` with the wrapper in `src/lib/api.ts`
- `axios` / `react-query` / `zustand` are intentionally NOT added to keep deps minimal; use React context + `useEffect`
- `dayjs` is already installed — use it for all date formatting/manipulation
- All protected API routes require `Authorization: Bearer <access_token>` header
- `brand_id` must be passed as a query param on every data endpoint
- Meta OAuth callback needs special handling: the redirect URL comes back to the frontend with `?code=...` — route `/meta/callback` should parse this and call the backend callback endpoint
- CPP = Cost Per Purchase = `spend / purchases`
- Color thresholds for CPP: ≤ $60 green, ≤ $100 yellow, > $100 red
- **Meta App must be in Live mode** (or your account added as Developer/Tester) for OAuth to work
- **2-phase OAuth temp tokens expire in 10 minutes** — if the user takes too long to pick an account they will get a 422 and must restart the flow
- **Background polling** is used for automatic updates without user interaction
- **Type labels** help users quickly identify hierarchy level (Campaign/Ad Set/Ad)

---

## Phase 14 — Future Enhancements (Q2 2026)

> Advanced UI features, enhanced automation controls, and improved user experience.

### 14.1 — Results Tab (Dashboard Bottom Section)

- [ ] Create `ResultsTab` component in Dashboard.tsx
- [ ] Add tabbed view below KPI cards with tabs:
  - [ ] **Summary**: Aggregated metrics with comparisons
  - [ ] **Top Performers**: Best campaigns/adsets/ads by ROAS
  - [ ] **Alerts**: Recent automation alerts (last 10)
  - [ ] **Trends**: Mini time-series charts for spend, purchases, ROAS
- [ ] Implement data fetching for each tab:
  - [ ] Reuse existing metrics API
  - [ ] Add sorting/filtering for top performers
  - [ ] Integrate with alerts API
- [ ] Add visual indicators:
  - [ ] Green/red arrows for trend direction
  - [ ] Sparkline charts for quick visualization
  - [ ] Color-coded performance badges

### 14.2 — Ads Performance Enhancements

- [ ] **Total Count Display**:
  - [ ] Add summary cards above table showing:
    - [ ] Total entities (campaigns/adsets/ads) based on active tab
    - [ ] Active count (green badge)
    - [ ] Paused count (orange badge)
    - [ ] Total spend across all visible entities
  - [ ] Update counts dynamically when tab changes
  - [ ] Add loading skeleton for cards
- [ ] **Media Preview Column**:
  - [ ] Add "Preview" column to Ads table
  - [ ] Fetch creative data from `/integrations/meta/ads/{id}/creative`
  - [ ] Display thumbnail images (40x40px) in table
  - [ ] Click thumbnail to open lightbox modal with full-size preview
  - [ ] Video creatives: show play icon overlay, modal has video player
  - [ ] Carousel creatives: show first image with "+N" indicator
  - [ ] Add placeholder icon for ads without creatives
  - [ ] Cache creative URLs to avoid redundant fetches

### 14.3 — Enhanced Automation Rules UI

- [ ] **Relational Rules Form**:
  - [ ] Add "Rule Type" toggle (Simple / Relational)
  - [ ] Show secondary metric fields when Relational is selected:
    - [ ] Secondary Metric dropdown
    - [ ] Secondary Condition dropdown
    - [ ] Secondary Threshold input
  - [ ] Add relation type selector (Without / With Min / With Max / Ratio)
  - [ ] Add validation for relational rule combinations
  - [ ] Show helper text explaining relational logic
- [ ] **Entity Type Targeting**:
  - [ ] Add "Apply To" dropdown (Campaign / Ad Set / Ad / All)
  - [ ] Show entity type badge on each rule card:
    - [ ] Blue badge for Campaign
    - [ ] Green badge for Ad Set
    - [ ] Purple badge for Ad
  - [ ] Add optional "Specific Targets" field for selecting individual entities
  - [ ] Update API calls to include entity_type parameter
- [ ] **Rule Templates**:
  - [ ] Add "Create from Template" button
  - [ ] Fetch templates from `GET /automation/templates`
  - [ ] Show template picker modal with descriptions
  - [ ] Pre-fill form with template values
  - [ ] Allow editing before saving

### 14.4 — Advanced Rule Examples in UI

- [ ] Create "Examples" section in Automations page:
  - [ ] Expandable accordion with 5 example rules
  - [ ] **Example 1**: "Pause if spend > $1.40 without purchases"
  - [ ] **Example 2**: "Hard stop at $1.50 spent"
  - [ ] **Example 3**: "Require minimum 2 purchases"
  - [ ] **Example 4**: "Alert on ROAS below 1.5x"
  - [ ] **Example 5**: "Warn if CPP exceeds $100"
- [ ] Add "Use This Rule" button on each example
- [ ] Pre-populate create form with example values

### 14.5 — Sync Status Improvements

- [ ] Add real-time sync status indicator in Topbar:
  - [ ] Show "Syncing..." with spinner during active sync
  - [ ] Show "Last synced X ago" when idle
  - [ ] Color-code: Green (< 1h), Yellow (1-6h), Red (> 6h)
- [ ] Add sync history modal:
  - [ ] Show last 10 sync operations
  - [ ] Display duration, entities synced, errors
  - [ ] Link from sync timestamp in Topbar
- [ ] Implement auto-refresh:
  - [ ] Listen for `adops:sync-complete` WebSocket event
  - [ ] Auto-refresh affected pages (Dashboard, Ads)
  - [ ] Show toast notification "New data available"

### 14.6 — Type Definitions Update

- [ ] Update `src/lib/types.ts` with new fields:
  - [ ] Add to `AutomationRule`:
    - [ ] `rule_type?: 'simple' | 'relational'`
    - [ ] `entity_type?: 'campaign' | 'adset' | 'ad' | 'all'`
    - [ ] `secondary_metric?: string`
    - [ ] `secondary_condition?: string`
    - [ ] `secondary_threshold?: number`
    - [ ] `relation_type?: 'without' | 'with_min' | 'with_max' | 'ratio'`
    - [ ] `target_entity_ids?: number[]`
    - [ ] `action_target?: 'self' | 'parent_adset' | 'parent_campaign'`
    - [ ] `evaluation_window?: 'daily' | 'lifetime' | 'last_7_days' | 'last_30_days'`
  - [ ] Add to `Ad`:
    - [ ] `image_url?: string`
    - [ ] `video_url?: string`
    - [ ] `thumbnail_url?: string`
    - [ ] `creative_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'UNKNOWN'`
  - [ ] Add new type `RuleTemplate`:
    - [ ] `id: number`
    - [ ] `name: string`
    - [ ] `description: string`
    - [ ] `template: Partial<AutomationRule>`

### 14.7 — Performance & UX Polish

- [ ] Implement optimistic UI updates for all mutations:
  - [ ] Rule toggles (enable/disable)
  - [ ] Campaign pause/enable
  - [ ] Settings updates
- [ ] Add keyboard shortcuts:
  - [ ] `Ctrl+S` - Trigger sync
  - [ ] `Ctrl+N` - Create new rule
  - [ ] `Esc` - Close modals
  - [ ] `Ctrl+K` - Search campaigns
- [ ] Add table enhancements:
  - [ ] Column sorting (click header to sort)
  - [ ] Column visibility toggle
  - [ ] Export to CSV button
  - [ ] Bulk select with checkboxes
  - [ ] Bulk pause/enable for selected items
- [ ] Add loading skeletons for all async operations
- [ ] Improve error messages with actionable suggestions

---
