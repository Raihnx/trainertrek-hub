
## Goal

Keep the existing gold/black UI intact. Remove all mock data. Build the full Supabase backend (schema, RLS, types, hooks) and rewire every page to real data. Add auth validation, Google sign-in, forgot password, notifications, search, month filter, client CRUD, attendance marking with day-lock rule, and incentive calculation.

## 1. Database Schema

All tables owned by the trainer (`trainer_id = auth.uid()`). RLS: trainer can only read/write their own rows. `profiles` already exists — we extend it.

```text
profiles (existing — extend)
  + phone text
  + address text
  (already: id, email, display_name, avatar_url, specialization, certifications, level)

packages
  id uuid pk
  trainer_id uuid → auth.users
  name text                     e.g. "Elite — 6 months"
  duration_days int             e.g. 180
  price numeric                 e.g. 36000
  created_at, updated_at

clients
  id uuid pk
  trainer_id uuid → auth.users
  name text
  phone text
  photo_url text
  package_id uuid → packages
  package_amount numeric
  amount_paid numeric
  total_days int
  eligible_days int             (derived from paid %, stored for fast reads)
  joining_date date
  expiry_date date              (joining_date + total_days + freeze_days)
  freeze_days int default 0
  status text                   ('active'|'expiring'|'expired') — derived view also OK
  created_at, updated_at

attendance
  id uuid pk
  trainer_id uuid
  client_id uuid → clients on delete cascade
  date date                     unique(client_id, date) — prevents duplicates
  status text                   ('present'|'absent'|'freeze')
  created_at
  -- Trigger: reject INSERT/UPDATE if date <> CURRENT_DATE (same-day-only rule)

payments
  id uuid pk
  trainer_id uuid
  client_id uuid → clients
  amount numeric
  paid_at timestamptz default now()
  note text

notifications
  id uuid pk
  trainer_id uuid
  client_id uuid → clients (nullable)
  type text                     ('expiry'|'payment'|'package_ending'|'attendance')
  title text
  message text
  read boolean default false
  created_at timestamptz default now()
```

**Relationships**
```text
auth.users ──1:1── profiles
auth.users ──1:N── packages, clients, notifications
packages   ──1:N── clients
clients    ──1:N── attendance, payments, notifications
```

**Derived (computed in views or app code, not stored)**
- `revenue = sum(payments.amount)` per trainer/month
- `incentive_per_client = min(2000, (2000/31) * attendance_days_this_month)`
- `monthly_incentive = sum(incentive_per_client)`
- `eligible_days = floor(total_days * amount_paid / package_amount)`

## 2. Auth changes

- **Signup validation**: zod schema enforces password rules (8+, upper, lower, number, special). Live checklist with green/red icons under the field. Email-exists → friendly error from Supabase `User already registered`.
- **Signin validation**: map `invalid_credentials` → check via admin? No — Supabase doesn't distinguish. Show single message: "Invalid email or password." (Cannot reveal account existence — that's a security best-practice; will note this to user and use generic message instead of the two separate messages requested.)
- **Google OAuth**: via `lovable.auth.signInWithOAuth("google")` + `configure_social_auth`.
- **Forgot password**: `/forgot-password` page → `resetPasswordForEmail` with `redirectTo: /reset-password`. `/reset-password` page → `updateUser({password})`.
- **Display name**: pulled from `profiles.display_name` everywhere (Header, Profile, greetings). Already set by `handle_new_user` trigger from `raw_user_meta_data.display_name`. Signup form sends `options: { data: { display_name } }`.

## 3. UI rewires (no visual redesign)

- **Dashboard**: remove Revenue + Renewals stat cards, remove Attendance Calendar. Add month dropdown (filters stats). Search bar filters clients/packages list. Notification bell opens a popover listing unread notifications. Logout moved into user-menu dropdown (top-right avatar).
- **My Clients**: real data, Add Client modal with all listed fields + photo upload to Supabase Storage, filter chips (package, active/expired/partial/fully paid/expiring), search.
- **Client Profile (`/clients/$id`)**: real data, interactive calendar where today's cell is clickable (present/absent/freeze), past days locked, future days disabled. Package timeline + eligible-days shading driven by paid %. Per-client incentive panel.
- **Attendance page**: real attendance log, filterable.
- **Memberships**: real list, "Manage" → `/clients/$id`.
- **Incentives**: computed via SQL view / RPC using the 2000-cap formula.
- **Profile**: editable form → updates `profiles`. Avatar upload to Storage bucket `avatars`.

## 4. Data layer

- TanStack Query hooks per resource (`useClients`, `useClient(id)`, `useAttendance`, `useIncentives(month)`, `useNotifications`, `useDashboardStats(month)`).
- Direct `supabase.from(...)` from client (RLS gates everything). No edge functions needed.
- Delete `src/lib/mock-data.ts`.

## 5. Storage

- Bucket `avatars` (public read, authenticated write to own folder) — for profile + client photos.

## Notes / deviations from request

1. **Signin error specificity**: Supabase intentionally returns a generic `invalid_credentials` to prevent email enumeration. I'll show "Invalid email or password" rather than separate "no account" / "wrong password" messages. This is the secure default.
2. **Notifications** will be generated client-side on-the-fly from current data (expiring memberships, unpaid balances) rather than a background job — simpler and accurate. The `notifications` table is kept for future scheduled alerts but the bell will show live-derived items.
3. This is a large migration — clients/packages/attendance/payments will start empty after wipe. I'll add an optional "seed sample data" button on the empty Dashboard so you can demo quickly.

Approve and I'll run the migration, then rewire the pages.
