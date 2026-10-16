# CORE — Phase 04: Authentication & RBAC

Date: 2026-10-15. Safe implementation is complete; verification results and blocked integration checks are recorded below. No deployment is authorized or performed. Phase 05 has not started.

## Goal

Extend the existing Supabase application with database-enforced user (Visitor), editor and admin permissions. Preserve stable-ID/versioned saves, the published museum catalog, asset validation/cleanup, Phase 03B operation receipts and administrator protection.

## Deployment prerequisites and rollback (recorded before SQL changes)

The first three historical migrations and the **unapplied** Phase 03B migration must precede the new Phase 04 migration. Do not edit/reorder historical files or apply only Phase 04. Inspect the actual target migration history, Auth/Storage columns, grants, triggers and policies with separately authorized read-only access before any deployment. No deployed state is verified here.

Real PostgreSQL tests and isolated Supabase RLS/RPC/Storage/Auth integration are required before enabling editor writes or privileged account actions. The new database editor-write switch defaults false; CORE_ADMIN_WRITES_ENABLED and CORE_ADMIN_GUARDS_VERIFIED remain disabled. Mocked tests are not proof of real SQL security.

Deploy to an isolated Supabase project first after review. Keep both Phase 03B gates and the editor-write switch off initially; verify current-role reads, anonymous/visitor denial, policy/grant definitions and Edge runtime compatibility. Enable editor writes only after actual policy/transaction tests pass. Enable privileged role/deletion gates only after the separate 03B concurrency/unknown-outcome acceptance passes. Use controlled disposable test identities/assets, never production account experiments.

Rollback starts by disabling editor writes and Phase 03B writes, then resolving every pending user operation without expiring/releasing uncertain reservations. Retain the operation journal and 03B guards. Restore captured prior function/policy definitions only with a reviewed script and after accounting for existing editor profiles; the old two-role constraint cannot safely be restored while editor rows exist. Do not automatically demote accounts, remove assets or drop receipt/history data. Roll back frontend/Edge code with gates off; historical 03B code does not understand editor payloads and must not handle new-role writes. Capture definitions and backup/recovery access before deployment.

## Existing implementation confirmed

Read the backend overview and all Phase 01–03B records, four existing migrations, Auth store/adapters, routes/guards, admin forms, service/domain types, Storage policies, transactional save RPC and regression tests before editing. Presented the existing/missing behavior, proposed changes and risks before implementation. The starting tree already contained all earlier uncommitted work; it was preserved.

Existing roles were user/admin. Phase 03B's operation journal, advisory lock, current trusted administrator checks, self/last-active-admin guards, invitation correlation and uncertain-outcome receipts existed in an unapplied migration. The save RPC was admin-only and retained invoker RLS, row locks and atomic child replacement. Existing Storage validation, public buckets, fresh names and admin-only cleanup were reused.

## Permission matrix

| Operation | user (Visitor) | editor | admin |
| --- | --- | --- | --- |
| Published museum catalog/content | Read | Read | Read |
| Draft exhibit/spec/gallery content | No | Read all drafts | Read |
| Create/edit draft exhibits and associated children | No | Yes, after database editor-write verification | Yes |
| Publish/unpublish or change published exhibits/children | No | No | Yes |
| Delete an exhibit | No | No | Yes |
| Select existing taxonomy for drafts | Active taxonomy | Existing active/inactive taxonomy | All taxonomy |
| Create/edit/delete taxonomy | No | No | Yes |
| Upload associated draft assets | No | Fresh insert only, verified switch required | Yes |
| Overwrite/move/delete Storage objects | No | No | Yes |
| Own name/preferred language | Existing own-profile grant | Existing own-profile grant | Existing own-profile grant |
| Assign roles/invite privileged users/delete accounts | No | No | Trusted Phase 03B protocol and gates only |

Content access requires a current confirmed-email Auth identity that is not banned/deleted/pending deletion. Editors collaborate on all drafts; no new per-owner draft rule is implied. `created_by` is set to the caller on editor creation and cannot be rewritten by editors. Editors can replace/delete draft specification/gallery child records because the existing save RPC atomically replaces them; this does not permit deleting an exhibit or file. Featured changes remain admin-only; editors preserve any existing draft featured value.

Public bucket URLs remain publicly readable, including draft media. The table describes database content/workspace access and mutations, not private media delivery. No existing URLs, bucket visibility or objects were changed.

## What was implemented

- One new ordered additive migration widens the profile constraint without rewriting existing roles/data or trusting registration metadata. It adds current-role/capability helpers, a protected editor-write switch, draft RLS and direct-write guards, scoped Storage inserts and updated save/user-management RPC definitions.
- The existing content workspace now accepts editors. Its list explicitly requests drafts, defensively excludes published records and hides deletion/admin navigation. Direct published-edit/admin-only routes show localized permission denial. The existing form, file validation, staged gallery edits and versioned save pipeline are reused. Publishing/featured mutation controls are unavailable to editors.
- Editor creation/saves/uploads stay disabled until `core_content_access()` confirms the current editor role and the protected database switch. Missing/malformed/failed capability responses fail closed. UI permissions are not the security boundary.
- Database/user-management types, client validation, role filters, selectors and trusted assignments support editor. User is displayed as Visitor. The Edge handler blocks editor/admin invitations while guard verification is off; SQL also gates role changes and reconciliation.
- Auth restores privileges only from a matching protected profile and rejects unknown roles. Request generations prevent old profile/session loads restoring privileges after account changes, sign-out or invalidation. Failed restoration clears cached privileges. Own-profile updates strip extra fields and cannot overwrite a different session. Staff login waits for a current profile if an Auth event superseded its initial restore, then routes Visitor/editor/admin appropriately. Fixed that existing page's Auth translation namespace and added profile role/workspace navigation.
- Added native Auth/contract tests, role-aware browser workflows, extended user-management regressions and an explicitly optional actual PostgreSQL RLS/RPC/Storage/concurrency suite.

## Files changed

32 phase files; previous unrelated modifications are not attributed to this phase.

| File | Purpose |
| --- | --- |
| `supabase/migrations/202610150002_auth_roles.sql` | Unapplied role constraint, write switch, helpers, RLS/guards and RPC extensions |
| `supabase/functions/_shared/adminUsers.ts` | Editor role and filter validation |
| `supabase/functions/admin-users/handler.ts` | Fail-closed privileged invitation gate including editor |
| `src/features/auth/permissions.ts` | Pure role/capability mapping and validation |
| `src/features/auth/sessionState.ts` | Testable session restoration, invalidation and request-generation protection |
| `src/features/auth/authStore.ts` | Bind the existing store to Auth and current-session events |
| `src/lib/services/supabase/SupabaseAuthService.ts` | Protected role validation/mapping and own-profile field allowlist |
| `src/lib/services/supabase/SupabaseAdminService.ts` | Existing facade exposes database content capabilities |
| `src/lib/services/supabase/SupabaseMuseumItemsService.ts` | Optional explicit draft filter for the workspace; published catalog unchanged |
| `src/lib/services/supabase/adminUsersClient.ts` | Accept only the three supported server roles |
| `src/types/database.types.ts`, `src/types/services.ts` | Role, setting, helper and read-filter contracts |
| `src/hooks/useContentAccess.ts` | Session-scoped database editor-write capability |
| `src/hooks/useMuseumItems.ts` | Role-scoped list requests and stale-result suppression |
| `src/app/router/guards.tsx`, `src/app/router/index.tsx` | Shared content guard plus nested admin-only routes |
| `src/layouts/AdminLayout.tsx` | Role-aware workspace navigation/home |
| `src/pages/Admin/AdminPages.tsx` | Reuse list/form for editors; current-profile login routing and localized Auth labels |
| `src/pages/Admin/AdminUsersPage.tsx` | Editor role filter/assignment selector, existing safety states preserved |
| `src/pages/Profile/ProfilePage.tsx` | Display role and correct workspace link |
| `src/components/common/PermissionDenied.tsx` | Bilingual accessible denied state |
| `src/i18n/locales/en/admin.json`, `src/i18n/locales/fa/admin.json` | Matching role, denial and verification-gate copy |
| `tests/auth-roles.test.ts` | Native role mapping, fail-closed capabilities, Auth races and contract/gate regressions |
| `tests/auth-roles-sql.test.ts` | Opt-in fresh PostgreSQL fixture, all migrations, actual direct-role/RLS/RPC/Storage/concurrency assertions |
| `tests/auth-roles.spec.ts`, `tests/auth-roles.playwright.config.ts` | Role-aware UI/login/session regressions with blocked Supabase traffic |
| `tests/admin-users.test.ts`, `tests/admin-users.spec.ts` | Extend existing trusted assignment/receipt and user UI checks for editor |
| `package.json` | Existing Node test tooling: `test:roles`; no packages installed |
| `docs/backend/PHASE_04_AUTH_ROLES.md` | This record and deployment prerequisites |
| `docs/backend/PROJECT_BACKEND_OVERVIEW.md` | Append current Phase 04 contracts without erasing history |

## Database changes

The new migration follows `202610150001_admin_user_management.sql`. All four historical migration files remain byte-for-byte unchanged. Existing profile rows retain user/admin roles and the literal default/registration trigger remains user. No accounts are seeded or promoted.

`core_security_settings` contains one new configuration row with `editor_writes_verified=false`. RLS is on, with no public/anon/authenticated table access; only the trusted service role can select/update it. It has no browser write RPC. `core_content_access()` exposes only current role and the non-secret verification boolean.

`core_current_role()` reads Auth/protected profiles, not JWT role metadata. It mirrors Phase 03B eligibility and excludes pending deletion targets. User content/taxonomy reads require an eligible identity; staff additionally see drafts/inactive taxonomy. Existing taxonomy write and exhibit delete policies remain admin-only. Existing own-profile column grants and user-management service-only grants remain intact.

Direct exhibit triggers reject editor publication, published edits, identity/attribution/creation-time rewrites, featured changes and invalid media paths. Child policies/guards authorize the parent draft and reject editor child reparenting/ID changes. Direct child mutations invalidate the parent exhibit version as well. Parent/child statement-boundary guards acquire the same transaction advisory lock as Phase 03B before tuple locking; parent locks serialize child edits and Storage association checks with publication. READ COMMITTED is required; unexpected isolation denies writes. This serialization is conservative and needs real concurrency testing/profiling.

`save_museum_item` retains its signature, SECURITY INVOKER, existing UUID row lock, atomic replacement and slug constraints. It now requires a non-null loaded version for every update and permits only verified editors operating on an existing draft with draft output. It never creates missing items or transacts Storage. Direct table writes remain independently checked.

The Phase 03B `core_admin_users` body is carried forward with only the allowed-role/filter and privileged-role gate extensions. Self-protection, last-admin trigger, actor-bound receipts, protected intent, cancellation tombstones and uncertain Auth handling are retained. Both editor and admin invitation roles require verified guards, including later reconciliation. Current flags cannot be bypassed by an old pending receipt. Historical 03B gates are not enabled by this migration.

## Supabase and Storage changes

Local candidate source only. No migration, Edge Function, Auth change, secret, setting, upload, deletion, policy or bucket change was deployed. No Express/separate backend or dependency installation.

The editor INSERT policy uses `core_editor_asset_insert` to validate the existing bucket/path shape, parse the associated exhibit UUID and lock/check the current draft and current role. Only fresh `upsert:false` files are supported. There is deliberately no editor UPDATE/DELETE policy, preventing overwrite, rename and deletion of published/shared objects even when a file remains under a later-unpublished exhibit's prefix. Existing admin write/public read policies remain.

Phase 03 validation and naming helpers are unchanged. References must remain within the associated item and valid thumbnail/gallery/GLB locations. Existing draft references outside the accepted editor-safe shapes may require an administrator to repair them; nothing is moved automatically. Replaced/unreferenced assets from editor saves are retained by the existing admin-only cleanup check and reported separately; editors cannot sweep files or falsely infer complete reference visibility. No private-draft or garbage-collection system was added.

## Architecture decisions

Use existing service/store/routes/forms instead of a second dashboard/backend. `list({admin:true,status:'draft'})` is a staff read hint; RLS still decides visibility. The museum `catalog()` always requests published items and active taxonomy, including for staff visitors. Selected UUID/model state, camera, Canvas, loaders, animations and landing source are unchanged.

Database roles remain user/editor/admin; ordinary AuthUser is still named visitor for UI compatibility. `isAdmin` is derived only from the restored profile. Route guards are usability checks, not evidence of current server authorization. Auth changes clear old state immediately, and asynchronous list/capability results are scoped to identity/role. A staff form remounts on account/role change. Browser registration and own-profile updates construct allowed fields; database grants and the unchanged registration trigger remain authoritative even for direct Auth/REST attempts.

## Security considerations

No credentials were read or exposed. Server service credentials remain confined to the existing Edge entrypoint. Capability booleans are not secrets and are never authoritative when supplied by the browser. Unknown roles, expired/missing profiles, mismatched identities, failed capabilities and unverified sensitive paths fail closed.

RLS permissive policies combine with OR; direct row/statement guards and invoker RPC checks are additional protection against unauthorized old/new status changes and child moves. Trusted platform/service-role/FK maintenance can bypass ordinary client RLS and no-end-user trigger checks; those tools require operational controls. Nothing claims protection against a database owner disabling safeguards. See [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html) and [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

Preserve all Phase 03B caveats: existing access JWTs may outlive Auth changes until expiry, current server role checks are required, no automatic pending-reservation expiry/replay, and receipts can require manual actor-bound recovery. No real SMTP/invitation acceptance or Auth deletion was tested.

## Tests and verification

Executed on 2026-10-15 with existing Node tooling and installed Microsoft Edge:

| Check | Result |
| --- | --- |
| `npm run test:backend` | 32 passed |
| `npm run test:museum` | 11 passed |
| `npm run test:storage` | 14 passed |
| `npm run test:users` | 25 passed; 1 real Phase 03B PostgreSQL test skipped |
| `npm run test:roles` | 10 passed; 1 real Phase 04 PostgreSQL test skipped |
| Role-aware browser suite | 12 distinct tests passed; focused login case also passed after adding Auth-event invalidation coverage |
| Existing user-management browser suite | 15 passed, including editor invitation/assignment/filtering |
| Existing exhibit/admin browser suite | 14 passed |
| Existing museum browser suite | 11 passed |
| Protected landing browser suite, final production preview | 20 passed |
| `npm run typecheck` | Passed, including Edge source |
| Phase source/test ESLint | Passed |
| `npm run lint` | Only the two pre-existing protected LandingIntro set-state-in-effect errors at 291/612; no new warnings/errors |
| `npm run build` | Passed; existing large-chunk/ineffective dynamic-import warnings remain |
| `git diff --check` and phase-file whitespace | Passed |
| Protected starting-state hashes | 40 landing/scene/historical-migration/phase-record files unchanged |
| Phase 03B command carry-forward comparison | Only documented role allowlist/gate expressions changed |
| Browser bundle inspection | No service-key or privileged Edge-gate environment-variable names present |

Total **164 distinct passing tests and 2 explicitly skipped actual PostgreSQL tests**. The focused login rerun is not counted twice. Initial test development caught accessible-label/case/status selectors, an outdated assertion that editor was invalid, and the staff-login namespace issue; these were corrected without relaxing permissions or protected-system assertions. The final main bundle is approximately 1,974.58 kB (568.16 kB gzip). Existing Three.js/shader/deprecation diagnostics remain.

Browser tests use controlled service/HTTP fixtures and intercept Supabase traffic. Native tests verify actual client/handler/session orchestration, not database execution. No production Auth/Storage/account changes or emails were performed. Actual PostgreSQL checks are explicitly blocked, not substituted by mocked policy assertions. SQL source review/carry-forward checks do not certify syntax execution, RLS behavior or locking.

`test:roles` includes an opt-in real PostgreSQL case. It creates only its own ignored `.tmp/auth-roles-pg-*` cluster on loopback, uses fixture Auth/Storage schemas, applies all migrations in order and stops only its own cluster. It accepts binaries via CORE_TEST_PG_BIN, not an existing database URL or installed data directory. Assertions cover anonymous/user/editor/admin reads/writes, direct profile escalation, direct privileged command/settings denial, default metadata-resistant registration, the false editor switch, versioned draft saves, publication/published edits, child integrity, taxonomy denial, Storage insert/upsert/move/delete and unsafe paths, concurrent publication and concurrent admin-to-editor demotions, Auth ban/role changes and existing receipt protections. None of this case's PostgreSQL assertions ran without binaries. Actual Storage HTTP/object-byte behavior still needs isolated Supabase testing even after fixture SQL passes.

```powershell
npm run test:backend
npm run test:museum
npm run test:storage
npm run test:users
npm run test:roles
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npx playwright test --config tests/auth-roles.playwright.config.ts
npx playwright test --config tests/admin-users.playwright.config.ts
npx playwright test --config tests/backend-admin.playwright.config.ts
npx playwright test --config tests/museum.playwright.config.ts
# Run an owned production preview on port 5199 before the following landing command.
$env:PLAYWRIGHT_PORT = '5199'
npx playwright test --config tests/landing.playwright.config.ts
npm run typecheck
npm run lint
npm run build
git diff --check
```

To unblock SQL tests, supply only an approved binary directory containing initdb, pg_ctl and psql using CORE_TEST_PG_BIN, then run `test:users` and `test:roles` and require both integration cases to execute/pass rather than skip. Never use the installed database data directory or a production connection string.

## Exact remaining deployment requirements

1. Pass the actual 03B and 04 PostgreSQL suites without skips. Resolve every migration/grant/guard/locking finding before enabling sensitive writes.
2. With separately authorized read-only access, inspect the target migration history, exact profile constraint name, managed Auth/Storage columns, triggers/FK actions, existing policies/grants/functions and recovery administrator access. Capture backup/rollback definitions. Inspect the full migration dry run; do not deploy a different scope than reviewed.
3. In an isolated Supabase project, apply reviewed pending migrations in order, including 03B before 04. Deploy the updated admin-users function/contracts together with JWT verification, exact origins and approved redirect/SMTP configuration. Verify platform-injected credentials without exposing them. Keep both existing Edge flags and the new database setting false initially.
4. Verify actual anonymous/Visitor/editor/admin REST/RPC attempts, registration metadata resistance, profile/JWT/session refresh/revocation, draft and published child edits, version/slug constraints, role transitions and concurrent direct/RPC publication. Test real Storage upload/upsert/move/delete and file bytes against draft/published/shared/orphan references, including publication races. Verify that policy-filtered zero-row responses do not cause false success.
5. After real SQL guards pass, validate isolated controlled invitations/acceptance/SMTP, role assignment/self/last-active-admin protection, Auth deletion/Storage ownership/FK outcomes and lost/partial/unknown-result reconciliation. Retain actor-bound receipts and reservations; do not expire/replay them to bypass a failure.
6. Record acceptance evidence. An authorized operator may enable each switch only for its verified scope; editor writes require a trusted update of core_security_settings, and privileged accounts require both existing Edge gates. Production rollout needs separate authorization and target-state review. Start production verification with switches off, then enable only after approval/evidence. No automatic deployment or Phase 05 work.

Operator-only disable examples, not executed here:

```sql
update public.core_security_settings set editor_writes_verified=false where singleton;
```

```powershell
supabase secrets set CORE_ADMIN_WRITES_ENABLED=false CORE_ADMIN_GUARDS_VERIFIED=false
supabase db push --dry-run
```

Use the linked/explicitly selected **isolated** project after authorized setup; never assume the current CLI target is safe. Do not remove JWT verification, reset a database or bulk-delete assets. No unconditional enable command is provided.

## Known limitations and future dependencies

- PostgreSQL executables and Docker remain unavailable on PATH; the previously confirmed PostgreSQL bin directory still contains no executables. Existing installed data was not accessed. No installation/download/workaround was attempted in Phase 04. Both 03B and 04 real SQL suites remain blocked; editor writes, role assignment and deletion stay disabled by default.
- No actual target schema, migrations, managed Auth/Storage columns, RLS, gateway JWT signing, Edge runtime, SMTP or production account behavior is verified. Source implementation and mocked tests are not production acceptance.
- The global authorization/write lock is intentionally conservative. Measure contention, query plans and actual concurrent direct/RPC/Storage behavior before enabling editor writes. Out-of-protocol platform actions require separate controls.
- Public draft assets, conservative editor cleanup/orphan retention, existing legacy form placement choices, directory search scale, model optimization, physical phones/Safari and existing bundle/Three warnings remain separate work. No media quarantine or automatic cleanup is implied.
- The existing two protected LandingIntro lint errors remain; this phase does not change or suppress them. No Phase 05 work was started.

Safe local implementation and mocked regression verification are complete. **Privileged local/database acceptance and production acceptance remain incomplete.** The switches remain disabled by default; no deployed flag/setting/account was changed.

## How future phases should use this information

Read all phase records. Keep the new migration after 03B, use protected database roles and server capabilities, retain explicit creation/UUID/version semantics, and call the existing integrity save once per operation. Never add direct-profile role assignment, browser service keys, editor file deletion, sequential save fallbacks or blind retries. Retain public URL compatibility and shared GLTF resources. Future permissions/rooms/CMS work must extend and actually test the same policy/guard matrix before enabling new writes. Phase 05 remains unstarted.
