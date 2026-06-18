# KingdomCare OS Status Checkpoint

## 1. Product Positioning

KingdomCare OS is a daily operations command center for small care homes.

Its current shape is:

- a staff-facing internal operations tool
- focused on day-to-day care home workflows
- built to support shift reporting, incidents, medications, residents, and task coordination
- currently split between a Supabase-backed access layer and localStorage-backed care modules

The product direction is operational clarity first, then data durability and multi-user consistency.

## 2. Current User Flow

The current user flow is:

1. A user signs up or signs in with Supabase Auth.
2. On first setup, the user goes to `/onboarding`.
3. The user creates a care home.
4. The onboarding flow makes that user the first `admin` for the care home.
5. An admin can open `/staff` and add existing signed-up users to the care home as `admin`, `nurse`, or `caregiver`.
6. Signed-in members can access the dashboard and app routes once authenticated.
7. Care workflows such as residents, reports, incidents, medications, and tasks still run from browser localStorage.

Important current split:

- identity, care home membership, and staff access are Supabase-backed
- operational care data is still localStorage-backed

## 3. Current Roles

Current roles:

- `admin`
- `nurse`
- `caregiver`

Role source of truth:

- roles come from `public.care_home_members`
- roles are assigned by care home admins
- roles are not based on user self-selection in the UI

Current meaning:

- `admin`: owner/manager for MVP, can manage staff and core workspace access
- `nurse`: medication/clinical-focused user
- `caregiver`: daily care workflow user

## 4. Current Supabase Tables

### `public.profiles`

- one public-facing profile per Supabase auth user
- stores `id`, `full_name`, `email`, timestamps
- used by account settings and staff management lookups

### `public.care_homes`

- top-level tenant/workspace record
- stores the care home name and creator

### `public.care_home_members`

- membership join table between users and care homes
- stores role per member
- current role source of truth for workspace access

## 5. Current Supabase SQL/RPC Files

### `supabase/auth-schema.sql`

- creates `profiles`, `care_homes`, and `care_home_members`
- enables RLS on all three tables
- defines helper functions such as `get_my_care_home_ids()` and `is_care_home_admin()`
- defines baseline policies for profile access, care home read/create, and member read/insert/update/delete

### `supabase/002_create_care_home_rpc.sql`

- adds `public.create_care_home_onboarding(...)`
- handles profile upsert, care home creation, and first admin membership in one atomic RPC
- uses `SECURITY DEFINER` to avoid multi-step onboarding RLS failures

### `supabase/003_leave_care_home_rpc.sql`

- adds `public.leave_care_home_membership(...)`
- allows a member to leave a care home safely
- prevents the last remaining admin from leaving

### `supabase/004_staff_management_policies.sql`

- adds staff-management RPCs:
- `public.get_care_home_staff(...)`
- `public.add_care_home_member(...)`
- `public.update_care_home_member_role(...)`
- `public.remove_care_home_member(...)`
- centralizes admin-only member listing and membership mutations
- protects against last-admin removal/demotion and self-management edge cases

### `supabase/005_auth_profile_trigger.sql`

- adds `public.handle_new_auth_user()`
- creates an `AFTER INSERT` trigger on `auth.users`
- keeps `public.profiles` in sync for new signups
- includes a backfill for existing auth users missing profile rows

## 6. Current App Routes

### `/`

- dashboard
- shows quick actions and summary cards
- reads localStorage reports, incidents, medications, and tasks
- also checks Supabase membership and redirects to onboarding if signed in without a care home

### `/auth/sign-in`

- sign-in page for Supabase email/password auth

### `/auth/sign-up`

- sign-up page for Supabase email/password auth

### `/onboarding`

- creates the initial care home for a signed-in user
- makes that user the first admin

### `/account`

- account settings
- shows auth email, profile full name, care home name, and current role
- supports profile full name update
- supports safe leave-care-home behavior

### `/staff`

- staff management for admins
- shows current care home members
- supports adding signed-up users by email
- supports role updates and member removal with admin safeguards

### `/residents`

- resident list and resident management UI
- supports add/edit/archive/delete behavior for local residents

### `/residents/[residentId]`

- resident detail page
- shows resident profile information plus history for reports, incidents, medications, and resident-linked tasks

### `/shifts/new`

- create shift report flow
- uses active residents from localStorage resident state

### `/reports`

- report history and filtering
- still localStorage-backed

### `/incidents`

- incident logging and incident history
- still localStorage-backed

### `/medications`

- medication reminder/logging workflow
- still localStorage-backed

### `/tasks`

- daily task creation, filtering, completion, and clearing
- still localStorage-backed

### `/supabase-test`

- temporary developer-only Supabase connection test page
- verifies browser client initialization and `auth.getSession()`

## 7. Data Storage Status

### Supabase-backed features

- authentication
- user profile records
- care home records
- care home membership and roles
- onboarding RPC
- leave care home RPC
- staff management RPCs
- auth-to-profile trigger/backfill foundation

### localStorage-backed features

- residents
- shift reports
- incidents
- medications
- daily tasks
- dashboard operational stats based on those local modules

## 8. Security Status

Current security state:

- Supabase Auth is working
- RLS is enabled on `profiles`, `care_homes`, and `care_home_members`
- onboarding and staff management rely on RPCs where direct table operations would be brittle or unsafe
- account leave-care-home behavior also relies on a guarded RPC
- frontend role checks are UX-only and should not be treated as enforcement
- real enforcement currently depends on database policies and RPC auth/admin checks

Current practical implication:

- UI can hide actions from non-admins
- database and RPC logic are the actual protection layer

## 9. Completed Features

Confirmed working or intentionally implemented:

- Supabase email/password sign up
- Supabase email/password sign in
- logout flow
- auth-aware header state
- protected main app routes through `proxy.ts`
- onboarding flow to create care home and first admin
- account settings page
- profile full name update
- safe leave care home flow
- staff management page for admins
- add existing signed-up user to care home by email
- role update for other members
- member removal for other members
- last-admin protection for leave/remove/demotion paths
- residents module with local add/edit/archive/delete behavior
- tasks module with localStorage storage and UI
- dashboard task stats and next-task display
- resident detail task history display
- no demo residents shipped by default

## 10. Partially Complete Features

Existing but not production-complete:

- dashboard membership redirect is implemented in the page, but access and membership rules are not yet fully centralized app-wide
- staff management uses manual add-by-email instead of real invitation flows
- `/supabase-test` is still a temporary developer page
- profile creation is now addressed by SQL trigger/backfill, but it depends on the SQL being applied in Supabase
- local modules work for single-browser prototype usage, not coordinated multi-user operations

## 11. Known Risks / Technical Debt

- care modules still use localStorage, so data is browser-local and not shared reliably across users/devices
- app-wide membership guard is not fully centralized beyond auth route protection and selected page checks
- staff invite emails are not implemented yet
- deletion and account lifecycle handling are incomplete
- no real audit trail exists yet for access changes or care record changes
- no data migration plan exists yet for moving localStorage modules into Supabase
- current localStorage resident/report linking still depends partly on name snapshots and legacy compatibility behavior
- Vercel deployment may appear healthy while local prototype data remains device-specific

## 12. Testing Checklist

Manual test cases to run before the next milestone:

### Auth

- sign up with a new email and password
- verify sign in works afterward
- verify logout returns the user to sign-in

### Onboarding

- sign in as a user with no membership and confirm redirect to `/onboarding`
- create a care home and confirm the user becomes `admin`
- confirm dashboard access works after onboarding

### Account Settings

- open `/account` while signed in
- verify auth email, profile full name, care home name, and role display correctly
- update full name and refresh to confirm persistence
- test leave care home as `nurse` or `caregiver`
- test that the only admin cannot leave

### Staff Management

- open `/staff` as admin and confirm member list loads
- add a signed-up user by email
- confirm a non-existent profile email shows the expected sign-up-first message
- update another member’s role
- remove another member
- verify the last admin cannot be removed or demoted

### Admin vs Caregiver Access

- sign in as `admin` and confirm `/staff` is usable
- sign in as `caregiver` and confirm `/staff` shows the permission message

### Local Modules

- residents add/edit/archive/delete still works
- shift report creation still works
- reports filtering/delete/print still works
- incident create/delete still works
- medication create/delete still works
- task create/complete/delete/clear-completed still works
- dashboard stats still reflect local module activity

## 13. Next Recommended Milestone

Recommended next milestone:

1. Centralize app-wide auth, membership, and role guard behavior.
2. After that foundation is stable, migrate residents to Supabase first.

Why this order:

- access control should be consistent before more shared data moves server-side
- residents are the best first care-domain migration because other modules already reference residents
- moving residents first creates a stable anchor for later migration of reports, incidents, medications, and tasks

## 14. Do Not Build Yet

Postpone these until the foundation is stable:

- real email invite flows
- advanced role/permission matrix beyond `admin`, `nurse`, `caregiver`
- account deletion
- full member self-service lifecycle flows
- residents migration plus all other care-module migrations at once
- cross-module audit log UI
- analytics/reporting features beyond the current dashboard
- external integrations
- production-grade notification systems
- any new major care workflow modules before auth/membership/role enforcement is centralized

## Bottom Line

KingdomCare OS now has a meaningful Supabase-backed access foundation:

- auth
- onboarding
- profile records
- care homes
- staff membership
- account settings
- staff management

But the core care operations domain is still prototype-local. The next important move is not more feature breadth. It is tightening access foundations and then migrating residents to Supabase as the first shared operational dataset.
