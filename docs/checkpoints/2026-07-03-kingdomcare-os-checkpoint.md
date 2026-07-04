# KingdomCare OS Checkpoint

## Current Branch

- `ui/v0-dashboard-redesign`

## Latest Clean Baseline

- Latest commit: `49b53df Remove baseline lint warnings`
- Lint: `0 warnings`
- Build: `passed`
- Chromium Playwright: `13 passed`
- Git status: `clean`

## Completed Milestones

- Supabase-backed dashboard/admin foundation
- Supabase-backed residents with private signed photo URLs
- Supabase-backed tasks
- Supabase-backed incidents
- Supabase-backed medications and medication alerts
- Supabase-backed shift reports
- `/staff` role-aware workspace
- `/staff/manage` admin-only staff management
- Caregiver Workspace MVP inside `/staff`
- Caregiver smoke test with real E2E caregiver user
- Incident Reporting MVP at `/incidents/new`
- Caregiver Task Completion MVP
- Admin/Nurse Task Creation MVP at `/tasks/new`
- Role/access Playwright coverage for admin, nurse, caregiver
- Baseline lint warnings removed

## Current Protected Routes

- `/staff/:path*`
- `/shifts/:path*`
- `/incidents/:path*`
- `/tasks/:path*`
- `/residents/:path*`
- Other existing protected operational routes as currently configured in `proxy.ts`

## Role Model

- `admin`: owner/manager
- `nurse`: medication/clinical
- `caregiver`: daily care worker
- Users do not self-select roles; admin adds staff in `/staff/manage`

## Current Role/Access Guarantees

- Admin can access `/staff/manage` and `/tasks/new`
- Nurse can access `/tasks/new` but not `/staff/manage`
- Caregiver can access `/staff` and `/incidents/new`
- Caregiver cannot access `/staff/manage`
- Caregiver cannot access `/tasks/new`
- Caregiver does not see Create Task CTA
- Caregiver can mark open tasks complete from `/staff`

## E2E Users

- `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` for admin
- `E2E_CAREGIVER_EMAIL` / `E2E_CAREGIVER_PASSWORD` for caregiver
- `E2E_NURSE_EMAIL` / `E2E_NURSE_PASSWORD` for nurse

## Do-Not-Touch Constraints

- Do not touch `/v0-dashboard` unless explicitly asked
- Do not use `localStorage` for new features
- Do not create `/caregiver` route yet
- Do not build clock-in/out, payroll, scheduling, attendance, staff performance, medtech, or medication administration yet

## Recommended Next Milestones

- Medication workflow hardening later, but not med administration yet
- Incident detail/read polish
- Shift report polish
- Dashboard operational polish
- Owner-requested backlog: visitor log and bowel movement tracking
