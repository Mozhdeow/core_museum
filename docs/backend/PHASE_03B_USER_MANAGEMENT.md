# Phase 03B — Secure Admin User Management

## Phase name

Phase 03B — Secure Admin User Management, 2026-10-15. Safe implementation and mocked verification are complete. Privileged local acceptance remains blocked by unavailable PostgreSQL binaries; role changes and deletion stay disabled. Production acceptance is incomplete and no deployed resources were changed. This is not Phase 04.

## Goal

Complete the existing admin Users page using Supabase Auth, protected profiles, an Edge Function and a reviewed, unapplied migration. Preserve Phases 01–03 and unrelated work.

## Deployment and rollback plan (recorded before migration implementation)

No deployed changes are authorized by this phase. Before deployment, inspect the actual schema/migration history, profile trigger, Auth columns, Storage ownership columns, grants, policies and function definitions using authorized read-only access. Earlier anonymous 401 probes provide no such verification. Back up reviewed schema definitions and confirm recovery access through a separate platform administrator.

1. Run the new isolated PostgreSQL guard tests with an explicitly supplied local PostgreSQL binary directory. Never point them at an existing database. Run mock Edge/UI regressions separately; neither proves deployed Auth behavior.
2. Review/apply the new `202610150001_admin_user_management.sql` migration in an isolated Supabase project first. Verify grants deny anon/authenticated direct access to the privileged command and operation journal. Confirm the existing profile trigger still creates ordinary `user` profiles regardless of submitted metadata.
3. Verify the platform-injected Edge variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available to this entrypoint. Configure custom Edge-only secrets `CORE_ADMIN_ALLOWED_ORIGINS`, `CORE_INVITE_REDIRECT_URL`, `CORE_ADMIN_WRITES_ENABLED` and `CORE_ADMIN_GUARDS_VERIFIED`. Never use VITE_ names or try to create custom secrets using the reserved SUPABASE_ prefix. Origins are exact comma-separated origins, without wildcards. The redirect must be an allowed app origin with `/reset-password`, also configured in Auth's redirect allowlist. See [Supabase Edge environment variables](https://supabase.com/docs/guides/functions/secrets).
4. Deploy `admin-users` with JWT verification enabled. Initially leave writes/guard verification flags false. Verify listing, JWT/role rejection and exact CORS origins. Only enable ordinary writes after isolated Auth/profile tests; only set the guard-verification flag after real database concurrent role/deletion tests and Auth failure/reconciliation tests pass. The function independently checks JWT identity and current database authorization.
5. Test invitations only with explicitly authorized controlled accounts and SMTP configuration. An accepted invitation request does not prove email delivery. Test deletion only with disposable isolated users, including Storage ownership and foreign-key behavior. Do not delete production accounts during development.

Rollback: disable writes first and stop dispatching privileged requests. Reconcile every pending operation before changing the schema or removing the function; a request may still complete after an HTTP timeout. Retain operation receipts and any pending deletion reservation. Do not drop the journal or expire reservations to force-unlock unknown outcomes. Roll back frontend/function code while leaving additive database guards in place. A full schema rollback requires an offline reviewed script after pending work is resolved: restore the captured previous `is_admin` definition, remove only this phase's profile guard/command/helper, and archive receipts before dropping the new table. Existing Auth identities/emails/deletions cannot be undone by a migration rollback; invitations cannot be unsent and deleted accounts must never be silently recreated.

Operator-only command examples below are documentation, not commands executed in this phase. First use an isolated Supabase project after the preceding checks. Inspect the dry run and the complete migration history; a push can include earlier unapplied migrations, not just this file. Stop if its scope differs from the reviewed plan. Use authenticated CLI tooling, never paste service credentials into shell history or frontend environment files.

```powershell
supabase link --project-ref <isolated-project-ref>
supabase db push --dry-run
supabase db push
supabase secrets set CORE_ADMIN_WRITES_ENABLED=false CORE_ADMIN_GUARDS_VERIFIED=false
supabase functions deploy admin-users --project-ref <isolated-project-ref>
```

Verify the injected URL/service key and configure exact origins/redirect before invoking the function. Do not use `--no-verify-jwt`. Keep both flags false during initial read-only verification. This document deliberately does not provide an unconditional enable command: real PostgreSQL and isolated Supabase integration acceptance are prerequisites. Production deployment needs a separate authorized review of that project's actual state, migration scope and rollback access. Command syntax and dry-run behavior are documented in the [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push).

## What was implemented

- Replaced only the Users placeholder with the existing-style bilingual admin interface: server pagination/search/role/status filters, ID/email/name/role/registration/last-sign-in/status fields, invitations, profile editor and typed-email deletion confirmation. Native dialogs provide focus containment, Escape/Close behavior and keyboard access. The table scrolls inside its container on mobile.
- Extended the existing SupabaseAdminService facade with paginated users, capabilities, guarded mutations and reconciliation. There is no privileged browser SDK or direct profile creation. The client forwards the current session JWT, validates responses and never retries mutations automatically.
- Added the `admin-users` Edge Function, strict shared request/result types and an Edge TypeScript build target. It checks the caller through `auth.getUser(token)` and a trusted database authorization command, rechecks each database operation, validates bounded input, restricts exact CORS origins and returns allowlisted errors without credentials or provider details.
- Added an unapplied migration with a service-role-only operation journal/command, transaction-level advisory serialization, optimistic profile versions, self-protection, active-admin checks, role-removal/profile-cascade guards and pending-deletion exclusion from admin authorization.
- Added durable operation UUID receipts. A repeated begin request does not resend Auth calls. Uncertain outcomes keep receipts; reconciliation checks trusted state. Unknown requests are tombstoned before late handlers can start. The user list returns the caller's oldest pending external-operation receipt, allowing recovery after browser storage/tab loss.
- Added server-only write and guard-verification gates. Ordinary invitations/profile fields may be enabled independently. Role changes and deletion remain disabled unless real database concurrency guards are verified and the server flag is explicitly enabled. Browser controls do not bypass these gates.
- Added handler/client/UI regressions and a separate opt-in isolated PostgreSQL suite. Mock orchestration is explicitly distinguished from executing PostgreSQL.

## Files changed

| File | Purpose |
| --- | --- |
| `supabase/migrations/202610150001_admin_user_management.sql` | Unapplied journal, privileged command and administrator protections |
| `supabase/functions/_shared/adminUsers.ts` | Shared bounded input validation and result/domain contracts |
| `supabase/functions/admin-users/handler.ts` | Testable authenticated operation orchestration and CORS |
| `supabase/functions/admin-users/index.ts` | Deno entrypoint and trusted Auth Admin/RPC adapter; server secrets only |
| `supabase/functions/admin-users/deno.json` | Pin the existing Supabase SDK for Edge deployment |
| `supabase/config.toml` | Enable the local function definition with gateway JWT verification |
| `src/lib/services/supabase/adminUsersClient.ts` | Existing frontend client integration, safe errors, no automatic mutation retry |
| `src/lib/services/supabase/SupabaseAdminService.ts` | Existing facade exposes user management; exhibit integrity stays unchanged |
| `src/types/database.types.ts` | Manual types for the additive migration until verified CLI generation |
| `src/pages/Admin/AdminUsersPage.tsx` | Users list/forms/dialogs, capability gates and receipt recovery |
| `src/pages/Admin/AdminPages.tsx` | Remove the obsolete Users branch; taxonomy and exhibit behavior preserved |
| `src/app/router/index.tsx` | Connect existing `/admin/users` path to its completed page; guards/path hierarchy unchanged |
| `src/i18n/locales/en/admin.json`, `src/i18n/locales/fa/admin.json` | English/Persian user-management labels, messages and safety states |
| `tsconfig.edge.json`, `tsconfig.json` | Strict checking of deployed Edge source as part of the existing build |
| `package.json` | `test:users` using existing Node tooling; no dependency installation |
| `tests/admin-users.test.ts` | Isolated Edge-handler/transport and browser-client tests |
| `tests/admin-users-sql.test.ts` | Opt-in fresh-cluster PostgreSQL migration/grants/concurrency tests; never an existing DB URL |
| `tests/admin-users.spec.ts`, `tests/admin-users.playwright.config.ts` | Isolated bilingual/responsive browser workflows with Supabase traffic blocked |
| `docs/backend/PHASE_03B_USER_MANAGEMENT.md` | This phase, deployment/rollback, contracts and verification limits |
| `docs/backend/PROJECT_BACKEND_OVERVIEW.md` | Append Phase 03B without erasing previous phase history |

The 23-file inventory includes grouped pairs. Historical phase documents, original migrations, Auth store/services/guards, cinematic landing, museum state/rendering and exhibit/Storage integrity implementations are not edited by this phase. Earlier uncommitted work is preserved. The 47 protected files captured at phase start retain their recorded hashes. An unrelated `.env.example` edit appeared during this work and was preserved; it is not a Phase 03B edit.

## Database changes

One new migration is source only, not applied: `202610150001_admin_user_management.sql`.

- `admin_user_operations`: durable UUID/actor/kind/target/payload/state/error/timestamps. RLS enabled with no anon/authenticated access; no FK that would erase receipts when an account is deleted. One pending delete globally; one pending invitation per normalized email.
- `core_active_admin(uuid)`: trusted confirmed-email administrator, not deleted/banned or reserved for deletion. Invited/unconfirmed admins do not count as active administrators.
- `core_admin_users(uuid,text,uuid,jsonb)`: service-role-only dispatcher. Actor comes from verified JWT identity, never browser input. It validates again and serializes decisions with a transaction advisory lock. Privileged paths require READ COMMITTED; unexpected isolation fails closed.
- `core_profile_admin_guard`: protects administrator role removal and profile deletion/cascades under the same lock; rejects removal with no other active administrator.
- Existing `is_admin()` keeps its signature/grants and now delegates to trusted current Auth/profile state, excluding pending deletions. This is necessary so an account cannot retain admin permissions during an uncertain Auth deletion. Existing RLS policy definitions, content RPC and Storage policies are unchanged; their calls to `is_admin()` gain this stricter authorization behavior.

No seeding, destructive migration, deployed write or existing schema rewrite. Managed Auth/Storage column compatibility still requires deployed-state inspection before applying this migration.

## Supabase changes

Local source only. No deployed resource or account changes. The only backend remains Supabase; the Edge Function is justified by Auth Admin privileges.

## Architecture decisions

### Auth/users/profiles relationship

`auth.users.id` is the identity. `profiles.id` references it with ON DELETE CASCADE. The existing `handle_auth_user` trigger creates a profile with role `user` and copies bounded full name/locale; metadata cannot set the role. The existing email-sync trigger remains. `museum_items.created_by` uses ON DELETE SET NULL, preserving exhibits. Storage ownership can prevent Auth deletion and is never resolved by deleting museum files in this feature.

The frontend's existing AuthUser calls ordinary users `visitor`; the persisted/admin role selector uses the existing database values `user` and `admin`. No editor role or email-change workflow is introduced. Profile edits update authorized profile fields; they do not silently change Auth email or credentials.

Registration dates come from `auth.users.created_at`, including backfilled profiles; the profile's `updated_at` remains the optimistic concurrency version. Only the whitelisted authorized fields are returned.

### Edge Function contracts

One POST endpoint: `admin-users`. OPTIONS handles exact-origin preflight. Every POST verifies a user JWT and current trusted administrator state. Requests are bounded to 16 KiB and public contracts are in the shared module.

| Browser action | Input / result |
| --- | --- |
| `capabilities` | Server-derived `canInvite`, `canEdit`, `canChangeRoles`, `canDelete`; no browser flag is authoritative |
| `list` | Page >=1, size 10/25/50, literal substring search <=200 chars, role/status filters; authorized fields, total and oldest own pending receipt |
| `invite` | Operation UUID, email, bounded name, en/fa locale, allowed role; Auth invitation then protected profile association |
| `update` | Operation UUID, stable user UUID, originally loaded updatedAt and allowed profile fields; atomic versioned profile update and receipt |
| `delete` | Operation UUID, stable UUID/version, typed email; protected reservation, Auth Admin deletion, confirmed completion |
| `reconcile` | Operation UUID; terminal receipt, still-pending state, or safe cancellation tombstone for an operation that never began |

Success envelopes use `{ok:true,data:...}`; operation states are succeeded/failed/pending/cancelled. Only succeeded confirms completion. Errors use `{ok:false,error:<allowlisted code>,uncertain,operationId}` and appropriate HTTP status. SDK/provider errors, tokens and password metadata are not returned. An accepted invitation reports profile association and **does not certify email delivery**.

Internal RPC actions are authorize/list/update/begin_invite/finish_invite/begin_delete/finish_delete/reject/status. They are revoked from public, anon and authenticated; only the trusted function's service role can invoke them. The shared input parser constructs an explicit allowlist, so browser-supplied actor, password, service credential or extra fields are ignored. The handler derives actor and role-verification flags itself.

### Invitation workflow

Validate → reserve unique operation/email → Auth Admin invite with name/locale and random operation correlation marker → existing profile trigger creates ordinary user → final transaction associates only the matching new Auth identity and assigns the approved fields/role from the protected receipt. Correlation metadata is not role authority. An existing/racing account without the marker is never overwritten or promoted; it remains pending for review. Profile failure after Auth creation retains the ordinary account and pending receipt instead of deleting it or claiming success. Same operation replay never resends mail. Invitations are limited to 20 begun operations per actor/hour in this command; configure provider limits separately.

Reconciliation uses the current server write/guard flags, including invitations begun before a flag was disabled. It cannot promote a pending invited account while role verification is off. It also retains a pending ordinary-user invitation if an external operator promoted its profile before reconciliation: an unexpected demotion must not bypass the same role gate. Already-completed Auth deletion can be recorded without dispatching another Auth request.

### Profile and role management

Updates require the originally loaded profile version. The SQL command locks/serializes, rechecks current authorization, validates allowed role/name/locale and prevents self-role changes. Role changes additionally require the server's verified-guards flag. The profile guard enforces last-active-admin preservation for role removal/cascaded deletion, including direct privileged profile operations. Normal client grants still allow only existing own name/locale updates, not arbitrary role writes. React route guards are UX only.

### Deletion workflow and administrator protections

Validate typed email/UUID/version → check current authorization and self/active-admin/Storage ownership protections → persist deletion reservation under the global transaction lock → exclude the target from `is_admin()` → call `auth.admin.deleteUser(id,false)` → finalize only when both Auth identity and profile are absent. Pending deletion blocks new managed mutations until reconciled; concurrent requests cannot count its target as an available administrator. Existing content/Storage remains intact. An explicit Auth rejection can record a failed receipt and release the reservation after checking the identity still exists; unknown HTTP outcomes do not release it.

Auth and PostgreSQL do not share a transaction. Status checks never interpret an existing identity as proof a timed-out deletion failed; the original request might still finish. No timed lease expiry, blind deletion replay, automatic account recreation or file sweeping. A not-yet-started request is cancelled with a durable tombstone under the same lock, preventing a late handler from beginning it after the UI has checked its result. Receipts are actor-bound. The UI keeps a per-account tab receipt, and listing can recover the caller's oldest pending invitation/deletion after tab loss.

The guard mechanism is implemented but real PostgreSQL execution/concurrency is unverified here. `CORE_ADMIN_GUARDS_VERIFIED` must remain false until isolated SQL plus Auth failure-path verification passes. Mock concurrency is a model, not a certificate. Platform/service-role tools that bypass this protocol, especially external Auth bans/status changes, require separate operational controls and verification.

## Security considerations

JWT identity and current trusted database role are rechecked server-side. CORS is not authorization; requests still require a valid user JWT/current confirmed active admin. Public API keys cannot invoke Auth Admin operations. Server credentials exist only in the Deno entrypoint; browser code imports the pure contracts/client, never the server entrypoint. Existing publishable frontend credentials remain unchanged. No raw Auth object, encrypted credential, metadata collection or privileged error is exposed.

The journal contains profile/email data necessary for recovery and is service-role-only, with no user-facing table policy. Plan reviewed retention/access auditing; never prune pending receipts or reuse operation IDs. No automatic cleanup, bulk delete or Auth password handling. The UI confirmation is additional intent checking, not authorization. Role/deletion controls are disabled both in UI and server unless verified guards are enabled. Authorization loss during mutations or reconciliation hides cached user data and disables changes. A failed reconciliation preserves its unresolved receipt for later trusted recovery.

Last sign-in/status fields are read through the authorized SQL command, not exposed through public profiles. Managed Auth/Storage columns are version-sensitive: verify them before deployment. Auth deletion invalidates refresh sessions but already-issued access JWTs can remain usable until expiry under existing content policies. The new admin command/is_admin checks current Auth/profile state, but this phase does not redesign all content authorization or claim instant global token revocation. See the official Supabase [user management guidance](https://supabase.com/docs/guides/auth/managing-user-data) and [Auth Admin invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail).

## Future dependencies

Deployment inspection, isolated Supabase Auth/SMTP verification and real PostgreSQL concurrency verification are required before production acceptance. Future admin features must use the same guarded operation protocol.

## Known limitations

- No authenticated deployed access has been established. No deployed schema, Auth, SMTP, Edge JWT gateway, RLS, CORS or Storage ownership behavior is verified. Earlier 401 responses are not security proof.
- Real PostgreSQL migration/grant/locking tests remain unexecuted without an explicit usable `CORE_TEST_PG_BIN`. The user confirmed `C:/Program Files/PostgreSQL/18/bin` lacks initdb.exe, pg_ctl.exe and psql.exe. A further read-only search of common Program Files, tools, Chocolatey, Scoop, WinGet, user-program and E-drive installation locations found no usable binaries. PostgreSQL tools and Docker are unavailable on PATH. The installed data directory was not accessed or used. The official binary publisher returned a country-restriction 403; no bypass or installation was attempted. The user explicitly authorized finishing safe work with these tests blocked. Mock concurrency tests cannot certify PostgreSQL locking. Role changes and deletion remain disabled by default. Local acceptance for those privileged actions is incomplete until the real guard tests pass.
- The deployment flags are operator-controlled safety gates, not evidence by themselves. Do not set the verification flag merely because mocked tests pass.
- Pending operations can require manual trusted reconciliation if Auth never finishes, identity correlation fails, the profile trigger is missing, the original actor loses authorization through out-of-band changes or schema compatibility differs. There is no automatic timeout/release/resend. Another administrator cannot take over the actor-bound receipt without a separately reviewed recovery procedure.
- Email delivery, real invitation acceptance and password setup through the existing reset page require isolated Auth/SMTP validation. No emails were sent here. No email changes, password creation, bans, MFA administration or owned-file reassignment are implemented.
- Active-admin eligibility is confirmed email, admin profile, not banned/deleted/pending deletion, matching CORE's email Auth workflow. Phone-only/provider-specific accounts need a reviewed eligibility rule before support.
- Search/total counting uses literal substring scans with bounded page results. Large directories need measured indexes/query plans; listing currently shares the serialization lock. Results across pages are not one repeatable-read snapshot.
- Platform operators/service-role tooling can override the protocol. Auth status changes outside these guarded commands must be covered by operational controls; this is not protection against a database owner removing safeguards.
- Physical devices/Safari, real Supabase Edge runtime bundling and full security integration remain untested. The protected landing lint baseline persists (current line numbers are recorded with final checks).

## How future phases should use this information

Read all previous phase records. Preserve stable exhibit IDs/version checks, existing Storage cleanup and shared museum state. Do not bypass the user-operation command, expose a service credential, derive roles from metadata, expire pending reservations or claim production acceptance from mocked tests. Phase 04 has not started.


## Tests and verification

Executed on 2026-10-15 using the existing Node tooling and installed Microsoft Edge:

| Check | Result |
| --- | --- |
| `npm run test:backend` | 32 passed |
| `npm run test:museum` | 11 passed |
| `npm run test:storage` | 14 passed |
| `npm run test:users` | 23 passed; 1 real PostgreSQL integration test explicitly skipped |
| User-management browser suite | 14 passed, including authorization loss during reconciliation |
| Existing backend/admin browser suite | 14 passed |
| Existing museum browser suite | 11 passed on the complete final run |
| Existing landing browser suite, production preview | 20 passed |
| `npm run typecheck` | Passed, including shared contracts, handler and Deno entrypoint source |
| ESLint on Phase 03B TypeScript source/tests | Passed |
| `npm run lint` | Failed only the two previously documented `react-hooks/set-state-in-effect` errors in protected LandingIntro.tsx, currently lines 291/612 |
| `npm run build` | Passed; existing chunk/dynamic-import warnings remain |
| `git diff --check` | Passed |
| Captured protected-file SHA256 comparison | 47 unchanged |
| Frontend bundle inspection | No server service-key or privileged gate environment-variable names present |

Total: **139 passing tests; 1 blocked/skipped real PostgreSQL test**. No authenticated live Supabase requests, invitations, account changes, migration deployments or Storage operations were tested against production. The final production bundle main chunk is approximately 1,970.12 kB (566.86 kB gzip); existing Three.js/shader/deprecation warnings remain outside this phase.

One initial museum inherited-scroll check encountered a development-page reload that discarded the injected mock session and reached login. Its isolated rerun and then the complete 11-test museum suite passed with the workspace unchanged. No existing museum/Auth source or assertion was changed. Browser suites use controlled service/HTTP fixtures and block Supabase traffic; they do not certify live Auth/RLS/SMTP/Edge behavior. Historical documents retain their earlier Intro line numbers (298/619); the protected phase-start file already had the current 291/612 positions and its hash is unchanged.

The optional SQL suite initializes a brand-new cluster only under `.tmp`, binds loopback on a chosen port, uses minimal Auth/Storage fixture schemas and applies the existing plus new migrations there. It never accepts a deployed connection URL, never uses installed data and never resets an existing database. Its teardown stops only its own cluster and retains ignored diagnostics. The skipped suite covers actual grants, transactional versions, registration timestamps, self/last-active-admin rejection, simultaneous demotions, pending-delete fencing, Storage ownership, Auth/profile/content cascades, invitation trigger/default roles and current gate checks, cancellation tombstones and unexpected isolation. **None of those PostgreSQL assertions were executed here.**

```powershell
npm run test:users
$env:CORE_TEST_PG_BIN = 'C:/path/to/isolated-postgresql/bin'
npm run test:users  # real SQL guard test must run, not skip, before enabling privileged actions
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npx playwright test --config tests/admin-users.playwright.config.ts
npx playwright test --config tests/backend-admin.playwright.config.ts
npx playwright test --config tests/museum.playwright.config.ts
# Start an owned production preview on port 5197 before this landing command.
$env:PLAYWRIGHT_PORT = '5197'
npx playwright test --config tests/landing.playwright.config.ts
npm run test:backend
npm run test:museum
npm run test:storage
npm run typecheck
npm run lint
npm run build
git diff --check
```

Do not set CORE_TEST_PG_BIN to an existing database data directory. Supply the binaries only. The test creates its own disposable fixture cluster and requires no production credentials.

## Exact remaining production prerequisites

1. Obtain approved local PostgreSQL binaries, run `test:users` with CORE_TEST_PG_BIN and require the real SQL suite to pass without skipping. Correct any migration/guard findings before enabling role changes or deletion anywhere.
2. With separately authorized read-only access, verify the target Supabase migration history, managed Auth/Storage columns, profile/email triggers, FK actions, grants/RLS, current is_admin definition and recovery administrator access. Capture the definitions needed for rollback.
3. Apply the reviewed migration and deploy/bundle the Edge Function to an isolated Supabase project with both flags false. Verify the actual Edge runtime, JWT gateway/signing compatibility, trusted current-role rejection, direct RPC/table denial, CORS and response sanitization.
4. Verify ordinary profile/invitation flows with controlled accounts, redirect allowlist, SMTP, actual invitation acceptance and existing password setup. Exercise duplicates, stale versions, lost responses and profile finalization failure. Do not claim email delivery until observed.
5. After real database guard acceptance, verify privileged operations in that isolated project only: actual concurrent admin changes, self/last-active-admin rejection, deletion Auth/profile/content FK behavior, Storage-owner refusal, and pending/failed/unknown Auth results with safe reconciliation. Do not unlock reservations or resend unknown operations automatically.
6. Record acceptance evidence and obtain separate production rollout authorization. Only then deploy the reviewed scope to production, verify initially with flags false, and allow an authorized operator to enable appropriate flags. Monitor receipts and retain the rollback/recovery plan. No Phase 04 work was started.


## Secure Admin User Management completion — 2026-10-24

This entry supersedes the historical missing-PostgreSQL and two-role observations above **for the inspected local CORE instance only**. It does not authorize deployment, gate activation, account creation or deletion. Incoming Phase 08 museum/Entrance work was preserved.

### Verified local state and disabled-action diagnosis

A read-only transaction against `supabase_db_core-museum` confirmed all five migrations through `202610150002`, the actual `profiles` CHECK accepting exactly `user`, `editor`, `admin`, the editor-aware `core_admin_users` command, operation-journal RLS, service-role command execution, and denial of authenticated command execution. No profile/account rows or credentials were read. Labels are Visitor / Editor / Administrator (بازدیدکننده / ویراستار / مدیر). Auth restoration still requires a matching protected profile; registration metadata cannot supply a role.

The running local Edge reports `CORE_ADMIN_WRITES_ENABLED=false` and `CORE_ADMIN_GUARDS_VERIFIED=false`; `editor_writes_verified=false` remains unchanged. These gates explain disabled Add/Edit and role assignment. **The inspected local database is not missing Editor or its migration.** A different/remote frontend target, missing/older Edge deployment, invalid origin/JWT, revoked current administrator or invalid invitation redirect can independently prevent operation. Existing `.env.local` and its selected target were not changed or used for account experiments. New Edge source is not claimed deployed or authenticated against existing CORE.

### Corrections

- Added one pure role definition in `supabase/functions/_shared/roles.ts`, reused by session permission mapping, service/database domain types, request/response validation and Admin role choices. Table/selectors use the existing canonical bilingual `rbac.roles` labels; duplicate user-management role labels were removed.
- Capabilities now report supported roles using a read-only probe of the installed trusted command's Editor filter, rather than inferring support from user rows. The historical 03B `invalidInput` response yields only user/admin; other errors fail closed. This is **command-contract compatibility discovery**, not general catalog introspection of arbitrary customized database constraints. The actual local CHECK was independently verified above. Changed/custom targets still require operator schema review. Older Edge responses without role discovery retain read-only listing and explain why mutations are unavailable; deploy matching source to restore verified choices. The additive contract does not modify SQL, grants or RLS.
- Added distinct server redirect-configuration and write/role-gate explanations. Ordinary profile name/language edits remain possible under the ordinary-write gate; Editor/admin invitations and role changes retain the verified-guards requirement. Existing JWT checks, current database actor authorization, SQL concurrency/version/self/last-admin guards, correlation markers, UUID operation receipts and uncertain-outcome recovery are unchanged. No browser service credential, Auth email/password edit or status mutation was added.
- Kept the editor mounted during capability refresh/revalidation so unsaved values survive normal rerenders and tab switches. User-management fields stay in memory only: no account-edit drafts, credentials or upload data enter browser storage. Closing/unmounting/sign-out discards the form. Only existing actor-scoped operation ID/action receipts persist; unresolved receipts are retained for recovery.
- Conflicts retain fields and the originally loaded UUID/version, with an explicit **Discard edits and reload current profile** action. This reads the exact UUID, remounts only on explicit discard and does not silently rebase edits. Successful operations alone refresh the list; failed, pending and cancelled outcomes do not claim success or trigger an automatic mutation retry. Accepted invitation feedback still explicitly does not establish delivery.
- Removed the deletion editor/dispatch route from this page. Delete controls remain disabled with an explanation even if an older server advertises deletion. Existing server deletion protocol and recovery of historical receipts are preserved; deletion was not enabled.

Changed files: `src/pages/Admin/AdminUsersPage.tsx`; `src/lib/services/supabase/adminUsersClient.ts`; `src/features/auth/permissions.ts`; `src/types/services.ts`; `src/types/database.types.ts`; `supabase/functions/_shared/roles.ts`; `supabase/functions/_shared/adminUsers.ts`; `supabase/functions/admin-users/handler.ts`; both `src/i18n/locales/{en,fa}/admin.json`; `tests/admin-users.test.ts`; `tests/admin-users.spec.ts`; this document and `PROJECT_BACKEND_OVERVIEW.md`. The existing facade/entrypoint/SQL/security configuration did not need replacement.

### Focused verification

Exactly **12 representative tests passed** (4 native + 6 browser + 2 real PostgreSQL integration groups), with no final assertion failures or skips:

- Native handler/client: current Admin versus Visitor/Editor/forged/expired authorization; independent ordinary/privileged gates; concurrent administrator demotions and last-admin preservation in the transaction model; installed-contract/legacy role discovery, malformed capability refusal, redirect diagnostics and duplicate invitation prevention. Mock guards are not counted as real SQL evidence.
- Browser, Edge/Chromium, one worker, mocked services and blocked Supabase traffic: invitation acceptance without delivery claims; stable UUID/version/locale and permitted role edit; lost-response receipt recovery across route remount without resubmission; Persian mobile/RTL containment and keyboard-accessible invitation; discovered role options/privileged restrictions/Editor and Visitor denial/deletion disabled; unsaved fields across Auth revalidation and another tab, no field persistence, conflict retaining edits without list reload, explicit discard and confirmed save. Actual desktop and Persian-mobile screenshots were visually inspected.
- Existing SQL suites executed serially in cached `core-sql-tests:pg17-node24`, PostgreSQL 17.6, no network, read-only source mounts, fresh tmpfs clusters only. They cover 03B journal/grants/version/self/last-admin/concurrent transaction/invitation-correlation/unknown-receipt guards and Phase 04 role/RLS/RPC/direct escalation/guarded-role/concurrency behavior. Fixtures use synthetic identities; no installed CORE account, row, migration or volume was changed.

The first disposable SQL attempt could not create its socket lock on read-only `/run/postgresql`; a startup probe confirmed that exact infrastructure cause. Adding a tmpfs for that directory fixed the two blocked groups, which then passed once. The first sandboxed browser startup never opened the Vite test port and was stopped before any scenario executed; one permitted local-process retry ran all six successfully in 18.4 seconds. No assertions were weakened and no full regression suite was run. Existing Three/graphics warnings during the inherited app startup remain unrelated.

Commands for the focused native/browser selections:

```powershell
node --test --test-concurrency=1 --test-reporter=spec --test-name-pattern='verified identity and trusted|write and guard gates|concurrent HTTP role|capability role discovery' tests/admin-users.test.ts
# Browser process env: RAYON_NUM_THREADS=2, PLAYWRIGHT_CHANNEL=msedge;
# VITE_SUPABASE_URL=https://users-fixture.supabase.co and both existing public-key vars=fixture-public-key.
npx playwright test --config tests/admin-users.playwright.config.ts --workers=1 --grep 'invitation submits|editing sends stable|uncertain writes retain|Persian mobile|server role discovery|unsaved profile survives'
```

Typecheck and changed-TypeScript-file ESLint passed. One final production build and protected-file preservation results are recorded below after completion. Browser evidence is ignored under `.tmp/admin-users-completion/`; it contains synthetic test users only.

### Remaining activation steps and boundaries

1. Select the intended local target explicitly. `node scripts/local-supabase.mjs dev` is the existing local-only frontend procedure; it preserves `.env.local` and obtains public credentials without printing private values. Do not assume a normally launched Vite instance uses the inspected local schema. No migration is needed for **this inspected local database**; do not run db push/reset to enable buttons.
2. An authorized operator must serve/deploy the matching `admin-users` source **including `_shared/roles.ts`**, keeping `verify_jwt=true`, exact `CORE_ADMIN_ALLOWED_ORIGINS`, an Auth-allowlisted `CORE_INVITE_REDIRECT_URL` on the allowed app origin ending exactly `/reset-password`, and both write flags false initially. The existing `node scripts/local-supabase.mjs edge` helper deliberately writes both flags false. Do not edit it into a gate bypass. Check capability `supportedRoles`, current-role rejection, JWT/CORS and the actual authenticated administrator session on the selected target. No existing Admin session was authorized/used in this task.
3. Complete actual isolated Supabase **Auth** acceptance with approved disposable identities and SMTP/Mailpit: ordinary and privileged invitations, redirect/password setup, duplicate/no-resend behavior, full profile finalization, stale version, lost Auth response and safe reconciliation. The fresh SQL passes above prove PostgreSQL guards, **not** managed Auth/SMTP delivery, cross-service failure recovery or production behavior. Previously recorded fixture read/denial checks likewise do not prove positive privileged invitations. Keep unverified operations disabled. No real account creation, credential change or flag activation is authorized by these test results.
4. After that evidence and separate activation approval, an operator may set the ordinary write flag for ordinary invitations/profile edits on the verified local environment; the guards flag additionally requires verified real concurrent-role and Auth failure/reconciliation acceptance. Do not enable Editor content writes as a side effect. This page continues to disable deletion independently. Do not clear pending receipts, expire reservations or replay uncertain mutations to make activation appear successful.
5. Hosted/production schema/deployment/session/SMTP acceptance and prior Phase 06 operational containment prerequisites remain separate. No deployed readiness is inferred, no live credentials/accounts were changed, and museum/Landing/camera/CMS content work was not touched.

Final verification: TypeScript and changed-file ESLint passed; exactly one final production build passed (existing large-chunk/ineffective-dynamic-import warnings only). SHA256 comparison confirmed all 247 files outside this task's allowlist unchanged, including incoming museum/Entrance/Landing work, all migrations, security configuration and dependency manifests. No final failed assertion or skipped selected test remains. No real invitation, account mutation or gate activation was performed.


## Local runtime activation verification — 2026-10-24 (awaiting operator approval)

**Existing CORE has not been activated or migrated by this entry. No existing account was changed.** The new request authorizes isolated runtime verification; it explicitly requires separate approval before flag/account changes on existing CORE. The prepared non-destructive migration and Auth URL/service change will also be included in that approval.

### Actual local diagnosis

Target: Docker project `core-museum`, database `supabase_db_core-museum`, API `http://127.0.0.1:54321`, active frontend `http://127.0.0.1:5191`. The transformed active frontend uses this local API. The on-disk `.env.local` instead selects a hosted project and is preserved: launching ordinary Vite can therefore select a different environment. Use the existing local launcher explicitly. No hosted endpoint was contacted.

All four running/mounted function files matched current source at initial diagnosis, including `_shared/roles.ts`; the function was not missing that contract. Actual allowed-origin preflight returned 204/exact origin; forbidden preflight 403/no origin; missing and invalid JWT 401. Both Edge flags remained false, as did the independent editor-content switch. There is one active local administrator; no account change or credential access was used for this diagnosis. An authenticated capability response from existing CORE still requires an approved ordinary administrator sign-in.

A further real blocker was confirmed: running Auth has site URL `http://127.0.0.1:3000` and allows only `https://127.0.0.1:3000`, while Edge supplies `http://127.0.0.1:5191/reset-password`. SMTP is the existing local Mailpit container/port 1025. Its current email rate/frequency settings were read and are not changed. The correct reset route must be allowed before relying on invitations.

### Confirmed HTTP conflict defect and minimal correction

Actual stale-version RPC requests hung and flooded disposable PostgreSQL logs with the same conflict. The installed PostgREST is 14.18; business conflicts use SQLSTATE `40001`, which that runtime retries indefinitely. This is a transport defect missed by the previously passing direct PostgreSQL tests. See the [official Supabase diagnosis](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions) and [PostgREST release notes](https://github.com/PostgREST/postgrest/releases).

Prepared additive migration `202610240001_admin_users_conflict_transport.sql` changes exactly four `core_admin_users` conflict raises to `PT409`, retaining message `conflict`. It checks the expected definition/guard markers and refuses unexpected targets. Existing migrations are untouched. Applied **only to the disposable database** so far; before/after `pg_get_functiondef` comparison proved the four SQLSTATE statements were the only changes. UUID/version checks, lock, authorization, self/last-admin protection, grants, RLS, profile data, settings and journal rows are unchanged. Other CMS functions are outside this correction's scope. Existing CORE needs this reviewed migration before enabling edits, subject to operator approval. Do not upgrade unrelated services or remove version checks to hide the defect.

### Real isolated Auth/Edge/SMTP acceptance

Disposable project `core-admin-runtime-20261024`: API 55631, database 55632, Mailpit 55634, application origin 5192. Cached essential images match CORE: PostgreSQL 17.6.1.171, GoTrue 2.197.0, PostgREST 14.18, Storage 1.77.5, Edge 1.76.2. Existing CORE database/Storage were never reset or recreated. Only this isolated stack received synthetic accounts, role fixtures, migration correction and simulated interruption boundaries.

Seven focused runtime groups passed in their final state:

1. Confirmed synthetic Visitor/Editor/Admin sessions on matching services and current JWT-verified Edge source.
2. Actual missing/invalid JWT denial, current Visitor/Editor denial, exact allowed/forbidden CORS, supported-role discovery, ordinary capability availability, privileged invite refusal with guard flag off, and independent deletion/content-write denial with guards on.
3. Real invitations for user/editor/admin, Auth/profile correlation and locale finalization, messages delivered to Mailpit, exact permitted reset URL, invitation verification, password setup, fresh normal login and protected role restoration for all three roles.
4. Same-operation replay and duplicate-email refusal without another SMTP message; searched/role/status-filtered paginated actual user listing.
5. Profile/name/locale and guarded role update; stale original version now returns conflict promptly and never overwrites current fields. The original committed update was first recovered by its receipt.
6. Discarded response followed by receipt reconciliation; an explicitly interrupted post-reservation/pre-Auth workflow stays pending, then real Auth/SMTP completion is reconciled without resend; unknown UUID tombstones stop late writes; unauthorized receipt access is denied. These are controlled failure-boundary simulations against real services, not proof that every external network failure has been forced.
7. Two actual HTTP role changes racing under real SQL serialization leave one active admin; self-demotion and direct last-active-admin removal are rejected; no pending synthetic receipt remains.

The first four groups passed once and were not rerun. The initial fifth group exposed the real 40001 loop; only the blocked/unrun groups were resumed after the correction. A disposable PostgREST restart stopped that loop. Previous direct PostgreSQL suites were reused, not rerun. Two focused native regressions passed: existing independent gates and deletion disabled even when invitation/role flags are true. The Auth-only replacement procedure was separately rehearsed successfully on the disposable service, with signing keys/database connection settings preserved. No actual existing CORE workflow is claimed passed yet.

Persistent opt-in runtime test: `tests/local-admin-runtime.mjs`; it asserts the exact separate project/ports, matching images and empty initial Auth schema, so it cannot target existing CORE. It requires the disposable fixture prepared under `.tmp/admin-runtime/fixture` with current migrations/functions, API 55631/DB 55632/Mailpit 55634, Auth site 5192 and allowed `/reset-password`, email_sent=100 for fixture testing only. Run with `node tests/local-admin-runtime.mjs`; no package/dependency changes. Sanitized stage results and exact-diff proof are retained under ignored `.tmp/admin-runtime/`.

### Deployment preparation and reviewable approval scope

Confirmed activation risk corrected in Edge source: enabling existing write/guard flags previously also advertised/enabled deletion. `HandlerConfig.deletionEnabled` now defaults false, and the deployment entrypoint explicitly supplies false; new deletion requests are refused before reservation/Auth, while reconciliation of historical receipts remains available. Tests can explicitly exercise the old protocol in mocks only. This change does not bypass or remove deletion guards.

`node scripts/local-supabase.mjs edge` remains default-off. New explicit `edge-verified` mode requires the exact operator-created `.tmp/local-supabase/admin-users-approved.env`; it does not create that file or infer approval. It still asserts loopback API 54321, JWT verification is unchanged, and neither flag is browser controlled. Before approved activation, use the ordinary default-off launcher. After approval only, the prepared operation can create the approved env and the explicit verified launcher can serve the matching Edge source. Running ordinary `edge` again intentionally restores false flags.

Plan-only artifact: `.tmp/admin-runtime/activation-plan.json`. Prepared operator runner `.tmp/admin-runtime/activate.mjs` defaults to read-only plan mode; its `--apply core-museum-approved` mode must **not** be executed without the separate human approval. Its Auth-only replacement was rehearsed on the disposable project. Scope proposed for existing CORE:

- Apply only the reviewed four-SQLSTATE migration transactionally, with exact migration-history entry and retained prior function definition. No db push/reset, broad schema update or existing profile mutation.
- Persist site URL 5191 and allow its `/reset-password`, retaining the earlier allowlist; replace only the stateless Auth service on the same image/settings, preserving JWT keys/secret, database connection, database/Storage containers and volumes. Keep a stopped Auth rollback container until acceptance. Failure restores the old Auth container; keep writes off and retain the safe SQLSTATE correction/receipts.
- Start the current Edge with the two approved true flags using `edge-verified`. Deletion remains false and editor-content writes remain false. Confirm actual authenticated capabilities rather than trusting flags alone.
- With explicit approval for that identity, use one normal passwordless local Mailpit sign-in for existing administrator `mozhdee@gmail.com` (no password/role reset and shouldCreateUser=false), then exercise the real UI/server workflows through a legitimate administrator JWT. No sign-in/email has yet been sent.
- Invite exactly three controlled local accounts, retained after testing: `phase03b-local-visitor-20261024@core-test.invalid`, `phase03b-local-editor-20261024@core-test.invalid`, `phase03b-local-admin-20261024@core-test.invalid`. Verify their local Mailpit acceptance/role restoration; edit only their profile fields and cycle the controlled Visitor's role for role-change acceptance. Do not alter other existing accounts, delete accounts or remove pending receipts.

Approval is still outstanding. Exact remaining blocker: reviewed local migration + Auth reset allowlist + explicit gate activation and controlled live acceptance require operator consent. Existing credentials, role/account records and security flags remain unchanged; no hosted operations are authorized. Final typecheck/changed-file lint and cleanup results follow below.


### Approved activation completed on existing CORE — 2026-10-24

**LOCAL ADMIN USER MANAGEMENT IS OPERATIONAL.** This supersedes the approval-pending state immediately above. The operator explicitly selected approval of the complete named local plan and three controlled-account workflows. No hosted/production operation was performed.

Actions actually performed within that approval:

- Applied `202610240001_admin_users_conflict_transport.sql` to `core-museum` in one transaction with its explicit migration-history entry. Only four conflict SQLSTATE statements changed. Historical migrations, locks, guards, grants/RLS and existing profile records were preserved. The pre-change function definition is retained under ignored `.tmp/admin-runtime/core-admin-users-before.sql`. The actual HTTP stale-version result now returns 409/conflict promptly.
- Updated Auth's site URL to `http://127.0.0.1:5191` and added `http://127.0.0.1:5191/reset-password`, retaining its earlier allowlist. Replaced only the stateless GoTrue container using the same v2.197.0 image/runtime settings; checked equality of the existing JWT secret, JWT key set and database connection. Database and Storage containers/volumes were not reset/recreated. Persisted the URL settings in `supabase/config.toml`. No rate limit or credential was changed. The stopped Auth rollback container was removed only after live acceptance passed; no Auth data lives in that container.
- Served the current function through `node scripts/local-supabase.mjs edge-verified`, using the exact explicitly approved local env file. `CORE_ADMIN_WRITES_ENABLED=true` and `CORE_ADMIN_GUARDS_VERIFIED=true` were read back from the running local Edge. Actual authenticated capabilities returned `canInvite=true`, `canEdit=true`, `canChangeRoles=true`, **canDelete=false**, all three supported roles and no invitation configuration restriction. `editor_writes_verified=false` remains independently unchanged. JWT verification, current trusted actor checks, exact origins, receipts and self/last-admin guards remain in place.
- Per the explicit identity approval, obtained exactly one normal passwordless local Mailpit sign-in for the existing Administrator with `shouldCreateUser=false`; no password/role/profile reset. Used its real Auth JWT and normal frontend Auth restoration, with no mocked Auth state or service credential in the browser. Revoked only this test session with sign-out scope `local`; other user sessions were not globally signed out.

Six focused live groups passed through the actual existing CORE services/UI, with non-loopback browser requests blocked and no mocked service responses:

1. Approved normal Administrator sign-in and actual server-derived capabilities.
2. Add/Edit enabled in the actual `/admin/users` page; authenticated role restoration and capability availability after full refresh; Delete stays disabled.
3. Three controlled invitations submitted through the real modal, profile/locale/role association confirmed, all three emails observed in actual local Mailpit, permitted invitation/reset links accepted, new-account password setup, fresh normal sign-in and session restoration for Visitor/Editor/Admin. Accepted-request UI wording remains distinct from delivery; receipt acceptance alone never claims an email was delivered.
4. Controlled profile name/language edit and user→editor→user role cycle, stable UUID, and actual stale original version returning 409 without overwriting.
5. Duplicate-email UI rejection without account overwrite; actual search, role/status filter and Reload users returned the correct filtered account.
6. One real controlled profile commit whose HTTP response was intentionally dropped: UI displayed uncertain state, prevented resubmission, retained its receipt and recovered through Check result. Exactly one update was dispatched; no replay was needed.

The three expressly authorized accounts are retained, not deleted:

| Role | Local controlled account | UUID |
| --- | --- | --- |
| Visitor | phase03b-local-visitor-20261024@core-test.invalid | fddceb5a-b2d4-45f0-ae85-5ee9f2a09673 |
| Editor | phase03b-local-editor-20261024@core-test.invalid | 04d9a761-59ab-4f1f-a7e2-3d8579d6f0d3 |
| Administrator | phase03b-local-admin-20261024@core-test.invalid | 3cece3a0-9858-48aa-9b69-b42392e4c84c |

Generated test passwords, invitation/one-time links, access/refresh tokens and service credentials were not printed or added to source/reports. Use normal local Mailpit password-recovery flows if those retained test accounts are needed later. The pre-existing Visitor and Administrator profile/role/password fields were not edited. Normal approved Admin sign-in updates its usual Auth login/session metadata.

Final readback: reviewed migration present; PT409 transport present and old 40001 absent from `core_admin_users`; both approved Edge flags true; editor content writes false; deletion capability false; **zero pending user operations**. Sanitized evidence: `.tmp/admin-runtime/live-results.json`, `final-state.json` and `live-users.png` (the actual Users screenshot was visually inspected). The disposable runtime and its synthetic data were removed after verification; existing CORE remains running on API 54321 and app 5191.

Source changes for this activation task: existing Edge handler/entrypoint (independent deletion default-off), `scripts/local-supabase.mjs` (explicit verified local launcher), `tests/admin-users.test.ts` (deletion/gate regression), new `tests/local-admin-runtime.mjs`, new additive conflict-transport migration, authorized Auth URL additions in `supabase/config.toml`, this record and appended backend overview. No frontend or museum/Landing/camera/content source was changed in this activation task. Typecheck and changed-file ESLint passed. No frontend production build was necessary because frontend deployment artifacts were unchanged; the changed Edge source was actually bundled/served and tested in the disposable and approved existing local runtimes. No large SQL/native/browser matrix was rerun.

No mandatory local Users activation blocker remains. The currently open browser may retain the earlier disabled capability response: click **Reload users** or refresh `/admin/users` once. For subsequent local restarts, use `node scripts/local-supabase.mjs dev` and the explicitly approved `edge-verified` mode; ordinary `edge` deliberately disables both flags again. `.env.local` still selects a hosted target and was not changed. The new local migration/Edge source must travel together if this local environment is rebuilt through a separately authorized process; do not apply this activation to hosted infrastructure without its own review and approval. Local Mailpit receipt proves local capture, not Internet SMTP delivery.
