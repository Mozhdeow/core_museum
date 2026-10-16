# CORE — Project Backend Overview

Established: 2026-10-13, following the project audit and Phase 01 — Backend Integrity & Critical Fixes. This is the first backend overview; no previous backend document existed.

## Goal and architecture

Maintain CORE's existing application using Supabase PostgreSQL, Auth, Storage and RLS. Edge Functions are an option only when a later requirement genuinely needs privileged/server-side work. No Node.js backend, Express application or separate API server is part of this architecture.

React route pages call the existing service facade in `src/lib/services/index.ts`. Supabase is initialized in `src/lib/supabase/client.ts` using frontend publishable credentials. `authStore` manages session/profile state. Database authorization remains in RLS/grants and the SECURITY INVOKER save RPC; route guards are UX controls.

## Existing data and services

| Component | Role |
| --- | --- |
| `profiles` | Auth-linked identity, `user`/`admin` role and preferred locale |
| `categories`, `museum_sections` | Bilingual taxonomy and museum placement |
| `museum_items` | Stable UUID identity, editable unique slug, content, state, feature flags, media and attribution |
| `museum_item_specs`, `gallery_images` | Ordered exhibit children |
| `museum-images`, `museum-models` | Existing public buckets with admin writes and type/size restrictions |
| `SupabaseAuthService` | Login, registration, session/profile restoration, password/profile workflows |
| `SupabaseMuseumItemsService` | Content reads and domain mapping |
| `SupabaseAdminService` | Counts, taxonomy, user listing and integrity-aware content operations |
| `SupabaseStorageService` | File validation, fresh upload paths, public URLs and Storage operations |
| `itemIntegrity.ts` | Phase 01 orchestration and operation-scoped guarded cleanup |
| Curator adapter | Still a mock; unrelated to this integrity phase |

## Historical foundation

The repository contains three migrations: core schema, content Storage and atomic item save. They describe six application tables, RLS/grants, profile triggers, category/section seeds and two public buckets. `save_museum_item` updates an existing item and replaces specs/gallery atomically, locks by UUID, checks an expected timestamp when supplied, and returns the UUID.

The earlier audit found slug-based exhibit upserts, nontransactional editor saves, cross-asset cleanup and Storage-first deletion. Phase 01 repaired these local application paths while preserving the existing schema and security design. See [the phase record](./PHASE_01_BACKEND_INTEGRITY.md) for decisions, files, verification and limitations.

## Operational contracts for future phases

- `saveExhibit(item, {mode: 'update', files})`: retain the stable UUID and `updatedAt` originally loaded with the editor. Upload fresh files, then commit metadata, specs, gallery, media references and publication state through the existing RPC. Returns ID plus cleanup status and retained candidates.
- `saveExhibit(item, {mode: 'create', files})`: validate first, insert one unpublished draft using an assigned/generated UUID, upload files, then use the existing RPC to finalize. The RPC itself is not a creation mechanism. Known failed drafts can be reopened or retried as updates.
- `saveDomainItem`/`museumItemsService.save`: metadata convenience paths. New items with an assigned ID require explicit creation mode. A missing update target fails; it is never inserted as a fallback. Prefer `saveExhibit` when the caller needs cleanup warnings or uploads.
- `saveItem`: low-level existing-item RPC adapter requiring an ID and expected version. It neither uploads nor manages upload rollback.
- `updateMedia`, `setItemStatus`, gallery update/delete helpers: snapshot current metadata and use the RPC, preserving unrelated media. Interactive editing should submit one full `saveExhibit` using the original version instead of chaining these helpers.
- `removeItem`: read references and version, confirm database deletion first, then perform guarded cleanup. A Storage error after successful deletion is a cleanup warning, not evidence that the database operation failed.
- Keep gallery edits local until Save. Preserve gallery IDs and Storage paths. The current RPC regenerates specification IDs.
- Superseded-file cleanup requires admin visibility and complete reference checks. Shared assets are retained. Verification/Storage failures also retain assets. Do not interpret every retained file as an orphan.
- Uncertain write outcomes must be reconciled before retrying. Do not delete attempted uploads if an RPC may still commit their references.

## Files changed and implementation record

Phase 01 added `itemIntegrity.ts`, service regression tests, admin browser tests/configuration and these two documents. It updated the three existing content/Storage services, service interface, admin editor/list, backend status translations and the backend test script. The detailed file inventory is in the phase record. Existing landing documentation was retained; this phase made no landing, animation, museum-route or visual-design edits.

## Database and Supabase changes

Phase 01: **none**. No migration/resource changes, installations, live writes, bucket/policy edits or bulk cleanup were performed. The existing migration definitions are repository evidence, not confirmation of deployed state. Before release, inspect the deployed RPC signature/body, grants, constraints, Auth settings and Storage/RLS policies. Never add a fallback to nontransactional writes when the RPC is unavailable.

## Security considerations

Continue using only publishable frontend keys. Keep roles sourced from protected profiles and enforce content writes through existing RLS and admin checks. Preserve SECURITY INVOKER behavior. Verify cleanup visibility before interpreting empty query results. Keep authoritative Storage paths and operation-scoped candidates; no destructive folder sweeps. Public bucket URLs remain publicly readable, including assets associated with drafts.

## Future dependencies and known limitations

The initial draft insert, uploads, final metadata RPC and cleanup are separate stages. Failure can leave unpublished drafts or unreferenced files. There is no durable cleanup queue. Browser reference checks and Storage deletes are not atomic against arbitrary external writers. Any future shared-media registry or automated garbage collection needs verified server-side coordination and an explicit migration/deployment review.

Phase 01 tests simulate the inspected RPC; deployed PostgreSQL/RLS and real Storage behavior still require isolated integration verification. The full-project lint baseline has two protected Intro errors. Museum progression, dynamic taxonomy and selected-model integration were unfinished at the end of Phase 01 and are addressed in Phase 02 below. Complete physical rooms, advanced model optimization and privileged account administration remain future work.

## How future phases should use this overview

Read this overview and the phase records before backend changes. Run `npm run test:backend` and the admin browser suite when touching saves/media/deletion, plus typecheck, lint and build. Preserve original versions, stable IDs and conservative cleanup. Update the relevant phase record and this overview without erasing historical decisions. Phase 01 provides a tested local foundation; production readiness depends on deployed-state verification. Phase 02's local integration is recorded below.

Phase 01 verification: 29 service tests and 5 isolated admin browser tests pass; TypeScript and production build pass; phase source/tests pass ESLint. The two existing Intro lint errors remain separately documented. For the admin suite, set `PLAYWRIGHT_CHANNEL=msedge` and run `npx playwright test --config tests/backend-admin.playwright.config.ts` (owned local server, default port 5192; Supabase traffic blocked).

## Phase 02 — Museum data integration (2026-10-13)

See [Phase 02 record](./PHASE_02_MUSEUM_DATA_INTEGRATION.md) for complete inventory, verification and limits. The existing adapter now exposes `museumItemsService.catalog()` for published exhibits with active categories/sections, including bilingual descriptions and existing specifications/gallery metadata. Admin write architecture and Phase 01 guarantees are unchanged.

Current flow: service facade → user-scoped catalog store → ordered section/exhibit stops → one selected UUID → both MuseumCanvas and MuseumPage. MuseumLayout owns the catalog fetch and one ScrollTrigger, independent of fixed Canvas positioning. New visits start at the beginning; select/previous/next controls and scrolling update the same state. Empty sections have no selected exhibit. Unassigned null associations use UI labels; invisible/inactive non-null associations are excluded.

Operational contracts:

- Load museum data through `catalog()`; never request `list({admin:true})` for visitor-facing museum content. The service explicitly filters published items even for admin visitors.
- Section/category identifiers in the catalog are database UUIDs with separate editable slugs. `sections().id` now also uses UUIDs. Existing item `museumSection`/`category` slug fields remain available for admin compatibility.
- MuseumLayout alone calls the catalog hook. Scene/page subscribe to `useMuseumStore`, and Auth backgrounds no longer fetch museum records. Pending loads and ready session data are reused; account changes/retry invalidate request generations. Explicit reload reflects later admin publication changes.
- Use selected UUID for both model and details. Model callbacks must match current ID/URL. Cached GLTF nodes are cloned/fitted; never dispose shared geometry/materials/textures. Local skeleton resources are disposed separately. Only failed URL cache entries are cleared for explicit retry.
- Distinguish database loading/error/empty states from a missing or broken model. Procedural display is labeled and never substituted for real database content. Honor gallery/AI feature flags; AI remains an explicitly mocked service.

Database/deployed changes: none. Anonymous zero-record HEAD probes returned 401 for the three catalog tables. No authenticated/schema/RLS verification is implied; release still requires authorized read-only deployment inspection and isolated security integration checks. No new dependencies, backend, migrations, live writes or Storage deletions were introduced.

Future phases must preserve these contracts and run `npm run test:museum`, the museum browser suite (`tests/museum.playwright.config.ts`, installed Edge, default port 5193), Phase 01 regressions and protected landing regressions. Pagination, realtime invalidation, bounded cache eviction, animated-model profiling, actual rooms and live curator functionality remain separate work. Phase 03 has not started.

Phase 02 local acceptance: 29 Phase 01 service tests, 5 admin browser tests, 11 museum state/geometry tests, 11 museum browser tests and all 20 landing production-preview checks passed. TypeScript, build, phase-file ESLint and diff checks passed. Full-project lint retains the two existing Intro errors. Implementation/local acceptance is complete; authenticated production Supabase/schema/RLS acceptance remains incomplete (read-only anonymous probes returned 401).


## Phase 03 — Storage and asset pipeline (2026-10-13)

### Phase name

Phase 03 — Supabase Storage & 3D Asset Pipeline. This continues the completed local Phase 01/02 foundation; earlier “not started” statements remain historical snapshots, superseded by this entry. See [Phase 03 record](./PHASE_03_STORAGE_ASSETS.md) for the complete inventory and asset rules.

### Goal

Improve the existing Storage adapter and admin upload workflow while preserving transactional metadata, stable UUIDs, version checks, conservative cleanup and selected-model rendering.

### What was implemented

Content-aware async image validation, structural GLB inspection, safe generated upload paths, advisory asset budgets, weakly cached File reports, validated admin selection/previews, filenames/dimensions/model summaries, stale-selection guards and released preview URLs. Optional `SaveOptions.onStage` reports actual validation/preparation/upload/commit/cleanup work; observer failures cannot break saves. Successful saves and cleanup warnings are separate messages in English and Persian. All image preflight calls must now be awaited.

### Files changed

Phase 03 edits 15 files: `package.json`; `SupabaseStorageService.ts`, internal `assetValidation.ts`, `itemIntegrity.ts`, `errors.ts`; `AdminPages.tsx`, `AssetPicker.tsx`; English/Persian `phase2.json`; `asset-fixtures.ts`, `storage-assets.test.ts`, `backend-integrity.test.ts`, `backend-admin.spec.ts`; the Phase 03 record and this overview. Exact paths/purposes are listed in the phase document. Historical Phase 01/02 documents, landing, rendering, routes, authentication and migrations were preserved.

### Database changes

None. Existing UUID/path/slug constraints and RPC schema remain unchanged; no migrations applied.

### Supabase changes

Local adapter/UI improvements only. No deployed resources, accounts, files, policies, bucket visibility or configuration changed. No new dependencies, backend, Edge Function or secrets. Authenticated deployed verification remains unavailable; earlier anonymous 401 responses do not prove RLS correctness. The Phase 03 record lists the exact schema/RPC/Auth/Storage checks still required.

### Architecture decisions

Keep public `museum-images` (10 MiB) and `museum-models` (100 MiB). Preserve `items/{uuid}/thumbnail/{random}.{ext}`, `items/{uuid}/gallery/{random}.{ext}` and `items/{uuid}/model-{random}.glb`; never switch to plural folders or move existing files by default. Use existing path helpers and `upsert:false`. Cheap path generation does not replace awaited file inspection.

Image inspection checks extension/MIME/signature/browser readability/dimensions. GLB checks headers/chunks/JSON and basic references without full geometry/texture decoding. Required KTX2 is incompatible with the current loader and rejected; other extensions/external resources require manual compatibility review. Approximate triangles/counts/declared buffer bytes and partial embedded PNG/GIF texture estimates are authoring feedback, not measured GPU memory.

Recommended desktop targets: GLB <=20 MiB, <=200k mesh triangles, <=2048 px textures, <=16 materials, <=8 textures and <=4 clips. Mobile targets are lower (<=10 MiB, <=50k triangles, generally 1024 px textures). Prefer 1024 px thumbnails and 2048 px WebP/AVIF gallery images. These recommendations produce warnings where implemented; only existing size limits and format/readability/compatibility checks reject uploads.

The lifecycle remains validate → draft/version check → fresh uploads → existing-item RPC commit → operation-scoped reference checks → best-effort cleanup. No Storage transaction, pre-commit replacement deletion, sweeping or unsafe retry. Shared assets stay; uncertain writes retain candidates and require reconciliation. No additional admin WebGL context or shared GLTF disposal was introduced.

### Security considerations

Frontend validation is bypassable. RLS/grants/Auth and bucket policies remain the security boundary; they still need deployed verification. Public draft URLs expose draft media to anyone knowing the URL. Future private draft/quarantine workflows need authenticated admin access, signed previews and a reviewed publication/reference/cleanup design; do not silently privatize existing buckets or break URLs. Trusted content inspection/cleanup coordination is future scoped Supabase work, not a browser workaround.

### Future dependencies

Rooms consume Phase 02 selected UUID/taxonomy/public URLs. CMS work reuses this adapter/picker and integrity save. Optimization must preserve loader/cache/fitting behavior, verify Draco/Meshopt decoder availability and explicitly configure/test KTX2 before accepting required KTX2 assets. Video/standalone textures, shared-media registries, durable cleanup and private drafts require concrete requirements and reviewed schema/policy changes.

### Known limitations

No full glTF semantic/security validation, exact GPU estimate, universal texture inspection, model animation preview, byte-level progress or durable cleanup queue. Large JSON/compressed images/models can still consume browser memory. Reference-check/delete requests are not globally atomic against external reattachment. Physical phones/Safari and production access control remain unverified. Existing bundle/dependency warnings and the two protected Intro lint errors remain.

### How future phases should use this information

Read all phase records, await validators, retain stable UUID/original versions and call one `saveExhibit`. Treat budgets as recommendations and cleanup candidates as investigation data. Preserve public URL compatibility and shared GLTF resources. Reconcile uncertain writes before retrying and verify deployed state before any resource changes. Phase 04 has not started.

### Verification

Phase 03 local acceptance is complete: 32 backend tests, 11 museum native tests, 14 Storage tests, 14 admin browser tests, 11 museum browser tests and all 20 production-preview landing tests passed (102 total). TypeScript, final production build, phase-file ESLint, diff checks and captured protected-file hashes pass. Full-project lint retains only the two pre-existing Intro errors at lines 298/619; existing bundle/Three warnings remain. The full record documents the corrected invalid image fixture and test boundaries. Production Supabase/Auth/RLS/Storage acceptance remains incomplete. Phase 04 has not started.

## Phase 03B — Secure admin user management (2026-10-15)

### Phase name

Phase 03B — Secure Admin User Management. Safe implementation and mocked verification are complete; privileged local acceptance is blocked pending real PostgreSQL guard tests. Production acceptance is incomplete. Earlier phase completion statements remain historical and do not imply this phase's deployed verification. See [Phase 03B record](./PHASE_03B_USER_MANAGEMENT.md) for the full inventory, contracts, test evidence and deployment/rollback procedures.

### Goal

Complete the existing `/admin/users` page with authorized listing, invitations, profile/role editing, guarded deletion and truthful recovery from uncertain outcomes. Preserve the dashboard, existing Auth guards and all Phase 01–03 contracts.

### What was implemented

Server pagination/search/role/status filters; authorized email/name/UUID/role/Auth registration/last-sign-in/status fields; bilingual responsive list, loading/error/retry states, native accessible dialogs, bounded profile/invitation forms and typed-email delete confirmation. No password creation, email-change workflow or new role beyond `user`/`admin`.

The existing service facade calls one JWT-protected Supabase Edge Function. The function validates the Auth identity, checks current confirmed active administrator state in the database, allowlists input/output, restricts exact origins and calls Auth Admin only server-side. The browser never receives a service credential or directly creates profiles.

Durable actor-bound operation UUIDs, protected intent and terminal/pending receipts prevent blind Auth resubmission. The UI persists a receipt before dispatch, disables new writes while unresolved and can recover the caller's oldest pending external operation from the server after tab loss. Unknown operation IDs become cancellation tombstones to prevent late dispatch. Revoked/expired authorization hides cached user data while preserving unresolved receipts.

### Files changed

23 files, including grouped pairs in the full phase inventory: the new migration; shared request contracts; Edge handler/entrypoint/deno configuration; local Supabase function configuration; frontend admin-users client; existing Admin service, Admin pages and route connection; database types; English/Persian admin translations; Edge/root TypeScript configurations; package test script; native/optional SQL/browser tests and browser configuration; the phase document and this overview. No dependencies installed. 47 captured protected files remain unchanged. Unrelated earlier working-tree changes, including an `.env.example` edit seen during this work, were preserved.

### Database changes

One **unapplied** migration, `202610150001_admin_user_management.sql`. It adds the service-role-only RLS operation journal, `core_admin_users` command, trusted active-admin helper and last-active-admin profile guard. A transaction advisory lock serializes checks/writes; profile versions protect against stale edits. Auth-confirmed, unbanned, undeleted administrator profiles count as active, excluding pending deletion targets. Invited/unconfirmed administrators do not count.

Existing policy definitions, content RPC and Storage policies are unchanged. The existing `is_admin()` signature/grants are retained but its body delegates to current trusted Auth/profile state and pending-deletion exclusion. This authorization change requires isolated integration verification before deployment. No seeds, destructive schema changes or bulk file deletions.

### Supabase changes

Local source only: one undeployed `admin-users` Edge Function and unapplied migration. JWT gateway verification is configured on. No production schema/resources, accounts, invitations, files, policies, Auth or secrets were changed. The backend remains Supabase only.

The entrypoint requires platform-injected `SUPABASE_URL` and legacy `SUPABASE_SERVICE_ROLE_KEY`; verify runtime availability without exposing values or creating custom reserved-prefix secrets. Custom Edge-only settings are `CORE_ADMIN_ALLOWED_ORIGINS`, `CORE_INVITE_REDIRECT_URL`, `CORE_ADMIN_WRITES_ENABLED` and `CORE_ADMIN_GUARDS_VERIFIED`. Both flags default false and were not enabled. No VITE_ privileged settings.

### Architecture decisions

- `auth.users.id` remains identity; the existing trigger creates an ordinary profile and copies name/locale. Protected operation intent supplies any later authorized role. Metadata is only an invitation correlation marker, never role authority. The profile FK cascades with Auth deletion; exhibit `created_by` becomes null, preserving content.
- Browser actions: capabilities/list/invite/update/delete/reconcile. Service-only SQL actions authorize/list/update/begin_invite/finish_invite/begin_delete/finish_delete/reject/status. Current JWT identity supplies actor; browser actor/password/flag overposting is discarded. Registration uses Auth created_at; optimistic versions use profile updated_at.
- Invitations reserve normalized email/operation, call Auth once and finalize only the matching new identity/profile. A partial Auth success remains pending rather than being silently deleted or reporting success. Acceptance does not prove email delivery. Current write/role gates apply during reconciliation, including unexpected role changes made outside the protocol.
- Role updates and deletion require verified guards. Self role changes/deletion are rejected. Last-active-admin removal/profile cascades are checked under the shared lock; unexpected transaction isolation fails closed. Mock concurrency does not verify this SQL behavior.
- Deletion reserves the target, excludes it from admin authorization and blocks new managed writes until confirmed/rejected. Auth Admin deletion is outside the SQL transaction; only absence of both Auth and profile confirms success. Storage ownership is checked and owned files are never deleted to make account removal succeed.
- An uncertain Auth outcome has no automatic expiry, release, resend, recreation or sweeping. A trusted explicit rejection can release the reservation; an existing identity after a timeout is not proof of failure. Receipts remain actor-bound and can require reviewed manual recovery.

### Security considerations

Server-only service credential, current database authorization for every command, bounded/sanitized contracts, exact CORS and RLS/grant denial for client access to journal/privileged RPC. Frontend route/dialog checks are UX, not the security boundary. Existing own-profile grants remain restricted. Do not enable privileged flags based on modeled tests. Out-of-band Auth bans/status changes or platform/service-role tools need operational controls; this is not protection against a database owner bypassing the protocol. Existing access JWTs can outlive Auth deletion until expiry under some published-content policies; no instant global token-revocation claim is made.

### Future dependencies

Before production: obtain approved PostgreSQL binaries and pass the actual migration/grant/concurrency suite without skipping; inspect actual target migration history/schema/triggers/managed columns/RLS/recovery access; verify Edge bundling, JWT gateway/signing, CORS and denied access in an isolated Supabase project; validate real SMTP/invitation acceptance/profile versions; then validate controlled concurrent role/deletion, Auth failures, Storage ownership/FK and unknown-outcome reconciliation after real guards pass. Record evidence before separately authorized production rollout. The full record contains ordered commands and rollback steps recorded before migration implementation.

### Known limitations

No usable initdb/pg_ctl/psql binaries were found in the confirmed PostgreSQL 18 directory, PATH or additional common installation locations; Docker is also unavailable on PATH. Installed database data was not accessed. The user authorized finishing safe implementation with the real PostgreSQL suite blocked. **Role changes and account deletion remain disabled by default; their local acceptance is incomplete.** No deployed Supabase/Auth/RLS/SMTP/Edge integration is verified. No emails were sent or live users changed.

Pending receipts may need manual trusted review, especially if the original actor loses authorization; there is no cross-actor takeover procedure or automatic retention cleanup. Confirmed-email eligibility matches current CORE Auth; phone/provider-specific eligibility needs separate review. Directory substring scans/global serialization require profiling at scale. Physical Safari/phones, real Deno bundling and production security remain untested. Existing bundle/Three warnings and two protected Intro lint errors remain.

### How future phases should use this information

Read the full Phase 03B record plus all historical records. Reuse the guarded service/operation protocol, stable UUIDs, original versions, safe Storage behavior and selected-model state. Never use role metadata, privileged browser credentials, blind Auth retries or expiring reservations. Keep the gates disabled until actual guard verification. Phase 04 has not started.

### Verification

**139 tests passed, 1 actual PostgreSQL integration test skipped:** 32 backend, 11 museum native, 14 Storage, 23 user-management native, 14 existing admin browser, 11 museum browser, 20 production-preview landing and 14 new user-management browser checks. The final user tests include expired authorization during reconciliation without losing the pending receipt. One museum check encountered a development reload resetting its injected session; its isolated rerun and full final suite passed without changing existing source/assertions.

TypeScript (including Edge source), phase-file ESLint, production build, diff checks, frontend server-secret-name inspection and all 47 protected hashes pass. Full `npm run lint` still fails only the same two LandingIntro errors, currently lines 291/612; historical 298/619 entries above describe earlier snapshots. Final main JS is approximately 1,970.12 kB (566.86 kB gzip), with pre-existing bundle warnings. Mock tests are not evidence of PostgreSQL locking, real Auth, SMTP, RLS or production acceptance. Safe local work/documentation is complete; privileged local acceptance and all production acceptance remain incomplete. No Phase 04 work was started.

## Phase 04 — Authentication & RBAC (2026-10-15)

### Phase name and goal

Phase 04 — Authentication & RBAC. Implement user (displayed Visitor), editor and admin permissions in the existing Supabase application. Earlier “Phase 04 has not started” statements above are historical snapshots, superseded by this entry. See [Phase 04 record](./PHASE_04_AUTH_ROLES.md) for the full 32-file inventory, permission matrix, migration/rollback plan, tests and deployment prerequisites. Phase 05 has not started.

### Permission matrix

| Capability | Visitor | Editor | Admin |
| --- | --- | --- | --- |
| Published museum | Read | Read | Read |
| Drafts and children | No | Read; create/edit after database verification | Full content management |
| Publish/unpublish/edit published/delete exhibits | No | No | Yes |
| Taxonomy | Active reads | Read/select existing taxonomy | Manage |
| Storage writes | No | Fresh associated-draft inserts after verification | Existing full permissions |
| Storage overwrite/move/delete | No | No | Yes |
| User/role administration | No | No | Existing trusted Phase 03B command and gates |

Editors collaborate on all drafts; there is no new own-drafts-only model. Editor gallery/specification removal is a permitted draft-content operation required by the atomic save RPC, not exhibit or Storage deletion. Existing public bucket URLs—including draft assets—remain publicly readable; metadata permissions do not privatize them.

### What was implemented

The existing workspace admits editors only to draft lists/forms, hides admin-only links/deletion/publication/featured controls, rejects direct admin/published-edit routes with bilingual denied states, and uses database-derived write capabilities. Existing form/file inspection, original UUID/version, draft-first creation, atomic save, uncertain-outcome blocking and admin-only conservative cleanup are reused. No landing/scene changes.

Protected role restoration now recognizes editor and rejects unknown/mismatched profiles. Auth/session generations prevent stale account/profile requests restoring privileges after session changes/sign-out/failure. Staff login chooses the workspace from the current protected profile, including when Auth events supersede an earlier restore. Own-profile patches construct allowed fields. Content lists/capabilities/forms are scoped to identity/role. Profile navigation displays the correct role/workspace. User-management filters/assignments/validation include editor without bypassing protected operation receipts or verification gates.

### Files changed

32 files: one new migration; existing shared user-management contracts/handler/client/UI; role/session helpers and Auth store/service; existing content/admin services and domain/database types; content-capability/list hooks; routes/guards/layout; reused exhibit pages and profile page; denied component and English/Persian admin translations; native/optional SQL/browser role tests/configuration; extended user tests; package script; Phase 04 document and this overview. Exact paths/purposes are in the phase record. All four earlier migrations, four historical phase records, landing/scene source, Storage validator/adapter and integrity implementation are preserved. Unrelated working-tree changes remain intact.

### Database changes

New **unapplied** `202610150002_auth_roles.sql` follows the still-unapplied `202610150001_admin_user_management.sql`. It replaces only the profile role constraint to include editor; existing user/admin rows, literal user default and registration trigger remain unchanged. It adds service-only `core_security_settings` with `editor_writes_verified=false`, current eligible-role/capability helpers, draft content/child RLS and direct-write guards, a scoped Storage INSERT policy and new definitions of the existing save/user-management commands.

`save_museum_item` retains SECURITY INVOKER, UUID locking, slug constraints and atomic children; all updates now require a loaded version. Editor old/new state must remain draft. Direct writes independently reject publication/published edits, feature/identity/attribution rewriting and child moves. Direct child edits invalidate the parent version. Statement-boundary/row guards share Phase 03B's advisory lock and lock parents to serialize publication with child/asset writes; actual PostgreSQL verification remains required.

The Phase 03B command is carried forward with only allowed-role/filter and privileged-role gate extensions. Self/last-active-admin guards, current actor authorization, receipt idempotency/correlation, cancellation tombstones and unknown Auth handling remain. Editor/admin assignment and pending invitation reconciliation require the existing verified-guards flag. No migration was applied and no role was assigned.

### Supabase changes and architecture decisions

No deployed changes, secrets, accounts, invitations, uploads/deletions or new backend/packages. The Edge Function remains the only trusted Auth Admin boundary. Custom function gates remain off by default. Database roles are user/editor/admin; ordinary frontend role remains visitor. The public `catalog()` is still explicitly published/active, regardless of staff role.

Only editor fresh inserts to valid existing draft-associated item paths are added to Storage RLS; no editor overwrite/rename/delete policy. The unchanged upload adapter uses fresh UUID names and `upsert:false`. Editor superseded/orphan cleanup remains retained/reported through the existing admin visibility check; no unsafe sweep or reference-visibility assumption. Administrators retain the existing Storage permissions. No bucket visibility or URL changes.

### Security considerations

Database role authority is the protected profile joined to confirmed, undeleted, unbanned Auth state, excluding pending deletions. Browser metadata/role flags never authorize writes. Frontend role labels/guards are UX; RLS/RPC/direct guards enforce mutations. Client roles cannot update the verification setting, profile role, privileged RPC or operation journal. Unknown/failed capability data denies editor writes. Trusted platform/service tools remain an operational boundary, with existing JWT-expiry/manual-recovery caveats documented in 03B. No claim of real SQL/RLS safety is made from mocked tests.

### Future dependencies and exact deployment prerequisites

1. Supply approved initdb/pg_ctl/psql binaries via CORE_TEST_PG_BIN and pass both `test:users` and `test:roles` actual SQL suites without skipping, including simultaneous admin demotion and direct/RPC/child/publication/Storage attempts. Never point them at installed data or production.
2. Obtain separately authorized read-only inspection of the target migration history, managed Auth/Storage columns, constraints/triggers, RLS/grants, RPC definitions, settings and recovery administrator access. Capture backup/rollback definitions; review the complete migration dry-run scope.
3. In an isolated Supabase project, apply all reviewed pending migrations in order, deploy the updated Edge Function with JWT verification and safe CORS/redirect configuration, and keep CORE_ADMIN_WRITES_ENABLED, CORE_ADMIN_GUARDS_VERIFIED and editor_writes_verified false initially.
4. Verify actual JWT/session/registration/profile-role behavior, direct REST/RPC rejection for every role, full Storage HTTP/object-byte access/upsert/move/delete semantics, private database draft visibility, version conflicts and concurrent publication/role changes. Validate controlled invitations/SMTP and Auth deletion/ownership/FK/unknown-outcome recovery. Fixture SQL alone does not verify the managed service.
5. Only after the relevant real checks pass and evidence is recorded, enable the appropriate switch/gates in the isolated environment. A separately authorized production rollout must repeat target-state review and initial checks with gates off before enabling verified operations. Preserve receipts and the documented rollback plan. No automatic production changes or Phase 05.

### Known limitations

PostgreSQL executables/Docker remain unavailable; both real integration suites are blocked. Installed database data was not accessed. **Editor writes, privileged role assignment and account deletion remain disabled by default.** Actual deployed RLS/SQL/Storage/Auth/SMTP/Edge behavior is unverified. The global lock requires measured concurrency/scale testing. Public draft media, retained cleanup candidates, legacy placement selectors, physical devices/Safari and existing bundle/Three warnings remain separate work.

### How future phases should use this information

Read the full phase record and earlier contracts. Keep migration ordering, protected roles/current capabilities, UUID/versioned saves and conservative file retention. Do not derive role authority from metadata, add browser service credentials, restore sequential saves, give editors file deletion or replay/expire pending user operations. Preserve published museum/model state and existing URLs. Phase 05 has not started.

### Verification

**164 distinct tests passed; 2 actual PostgreSQL integration tests skipped:** backend 32, museum native 11, Storage 14, users native 25, roles native 10, role browser 12, user browser 15, exhibit/admin browser 14, museum browser 11 and production-preview landing 20. The role-login case additionally passed a focused Auth-event invalidation rerun, not counted twice. Browser suites intercept Supabase traffic; no mocked result is SQL/RLS/Storage-service proof.

TypeScript, phase-source/test ESLint, final production build, diff/whitespace checks, the 40 captured landing/scene/historical migration/document hashes, Phase 03B command carry-forward comparison and browser server-secret-name inspection pass. Full lint retains only the two existing protected LandingIntro errors at lines 291/612, with no new warnings/errors. Main JS is approximately 1,974.58 kB (568.16 kB gzip); existing bundle/Three diagnostics remain.

Safe implementation/documentation and mocked regressions are complete. Actual 03B/04 PostgreSQL guard and deployed Supabase acceptance remain incomplete; editor writes and privileged account gates stay disabled by default. No deployed resources or accounts were modified, and Phase 05 has not started.


## Phase 05 — Admin CMS & Exhibit Management (2026-10-15)

This entry supersedes earlier statements that Phase 05 was unstarted; prior phase records remain historical. Safe local CMS implementation and verification are complete; [PHASE_05_ADMIN_CMS.md](PHASE_05_ADMIN_CMS.md) records results, limitations and remaining deployment prerequisites. Phase 06 has not started. No deployed resources, accounts or security switches were changed.

### Goal and implemented behavior

Complete the existing exhibit workspace without replacing the application. Categories and sections now load counted, ordered database taxonomy with UUID values, localized labels, active-only new choices and visible retained inactive/missing associations. The service treats supplied UUIDs as authoritative even after slug changes/reuse; explicit empty IDs mean unassigned, while only legacy ID-omitting callers resolve slugs. Drafts can remain unassigned or retain old inactive placement; publication requires active existing category and section.

The existing listing now has bounded literal search across both titles, slug and brand; combinable status/category/section filters; status badges; exact totals and 10/25/50 item pages. Queries use stable sort_order/id order and safely quoted/escaped PostgREST values. CMS child/taxonomy range reads traverse REST caps and fail on incomplete responses/counts. Direct UUID form loading does not depend on list pagination. Loading, empty, unavailable, denied and error states are distinct, and deleted/out-of-range pages can return to page one.

The existing form supports bilingual specification labels with add/remove/reorder, staged gallery captions/order/removal, and ordered bilingual captions for newly selected images. New batches append after retained images. Shared metadata validation runs in the form and integrity service before side effects. Required fields, length/range/URL rules and localized field feedback are documented in the phase record. Optional source metadata can be cleared; existing license values are preserved. Phase 03's AssetPicker/Storage implementation is reused unchanged.

Draft/publish/unpublish still use one existing versioned atomic save, with explicit draft-first creation and stable recovery IDs. Conflicts retain edits and offer explicit discard/reload; unknown commits disable blind retries. Deletion failures require explicit successful refresh before another attempt. CMS resource responses belong to the current account/role, and a prior account's late deletion cannot start an obsolete refresh. Editor publishing/deletion/featured/published-edit controls remain unavailable, and the false server capability gate still disables editor saves/uploads. Success explains explicit museum catalog reload; no scene/store mutation is pushed by CMS saves.

### Files changed and architecture

Phase 05 changes only 22 files (grouped here; full inventory in the phase record): service contracts and prototype adapter, SupabaseMuseumItemsService/itemIntegrity/error translation, new contentQueries/exhibitValidation modules, new useCmsData hook, existing AdminPages plus new ExhibitList/TaxonomySelect, both admin locale files, existing backend-integrity/backend-admin/auth-roles tests, three new CMS test/config files, package.json test:cms and the two backend documents.

Existing interfaces/mappers/facades and one integrity pipeline are retained. SaveOptions gains optional galleryCaptions aligned with files.gallery; omitted captions remain blank as before. Keep loaded versions, UUIDs, gallery IDs/paths and staged changes until the atomic RPC. Metadata/placement checks are application content rules; they do not replace database permissions or add a new SQL constraint.

### Database and Supabase changes

None. No migration/seed/policy/function/config/secrets/deployment/real data change, upload/deletion or package installation. The still-unapplied Phase 03B migration precedes Phase 04 exactly as before. At original Phase 05 completion the protected snapshot matched; current migration/CLI exceptions are qualified in the resumed completion entry below. Auth/routes, landing/museum source, earlier phase records, AssetPicker and the Storage validator/adapter remain preserved. Unrelated existing changes are preserved.

CORE_ADMIN_WRITES_ENABLED, CORE_ADMIN_GUARDS_VERIFIED and editor_writes_verified retain disabled/default-off behavior. No switch was enabled and deployed state was not inspected. The protected-profile role, registration default, RLS/invoker RPC, draft guards, trusted user-management boundary, self/last-admin protection and actor-bound operation receipts remain intact. Public draft URLs and conservative editor/shared-reference cleanup remain existing limitations.

### Verification and known limitations

Native tests: **113 passed; 2 actual PostgreSQL suites explicitly skipped** (backend 41, CMS 12, museum 11, Storage 14, users 25, roles 10). Browser: CMS 13, existing exhibit/admin 15, roles 12, user administration 15 and museum 11 passed. Landing production-preview verification passed 20 distinct cases (19 full-run passes plus the unchanged reduced-motion case on isolated rerun). **Total: 199 distinct passes and 2 real PostgreSQL skips.** The first full landing run had one byte-identical canvas screenshot mismatch; the timing-sensitive case passed unchanged in isolation. No landing code/test wait/tolerance was modified and reruns are not double-counted. Original diff/phase-file whitespace checks and the 64 protected hashes passed at that time; the resumed entry below records later pre-existing exceptions. Typecheck, targeted ESLint and production build pass; full ESLint still has only the two pre-existing protected LandingIntro errors at lines 291/612. No new lint warning/error. Bundle warnings persist; main JS is approximately 1,992.77 kB / 573.20 kB gzip.

Mocked/native HTTP/browser checks do not verify SQL/RLS/locking or managed Auth/Storage. PostgreSQL binaries were unavailable during original verification; Docker is now discoverable as noted below. Installed data was not accessed. Both actual guard suites remain blocked. Exact counts/regex/offset pagination need measured scale acceptance; concurrent rows can move between pages. New content-quality checks can require repairing invalid legacy metadata. Activation at a concurrent admin commit is not a new SQL invariant. The public Phase 02 catalog retains its existing bulk-read row-limit boundary; validate capacity before scale rollout. No automatic cleanup, quarantine, model optimization or unrelated landing refactor was introduced.

### Future dependencies and production prerequisites

Follow the exact checklist in [Phase 05](PHASE_05_ADMIN_CMS.md#deployment-prerequisites-and-future-dependencies) and the Phase 03B/04 deployment records. Supply approved binaries and pass both real PostgreSQL suites without skipping; separately inspect/backup the target; review/apply pending migrations in order only in an authorized isolated project; deploy matching guarded Edge contracts with JWT/origin/redirect/SMTP protections; verify actual role/RLS/RPC/Storage/receipt/concurrency and Auth failure semantics with all sensitive switches false initially.

Add isolated CMS acceptance for count headers/range limits, literal bilingual search, UUID taxonomy, complete child hydration, publication and editor denial, failure/conflict recovery and catalog refresh/media/capacity. Record evidence before an authorized operator enables any verified scope. Production rollout requires separate authorization and target-state review. Phase 05 requires no additional migration.

Future phases should extend the existing page/taxonomy/get and integrity services rather than duplicate them, preserve explicit catalog refresh and receipt/version/cleanup rules, and never infer permissions from UI state or metadata. The local CMS foundation is ready for further local work; production/security-sensitive acceptance remains incomplete. Phase 06 was not started.


### Resumed completion verification — 2026-10-16

Rechecked existing Phase 05 code, contracts, documentation and logs without reimplementing completed features. No confirmed remaining CMS application defect was found. This resumed work changes only the two backend documents to correct historical hash/environment claims; application source, tests, migration candidates, gates and unrelated incoming work were preserved.

Fresh results: **113 native passes, 2 PostgreSQL skips; 13 CMS browser passes; typecheck/build pass.** Full ESLint retains only the two documented protected landing errors (zero warnings, no CMS errors). The 126 fresh passes overlap the original 199 distinct-case inventory and are not counted as new cases. Existing browser results, including the landing screenshot mismatch/unchanged passing rerun, were verified from retained logs rather than all repeated. CMS browser verification used explicit fake Supabase credentials/host and intercepted HTTP, with no local or production Supabase data access.

The incoming tree already contained substantive edits to both 202610150001_admin_user_management.sql and 202610150002_auth_roles.sql, changed CLI metadata, and additional local branch/runtime metadata and an SQL snippet. These are outside Phase 05's inventory and were preserved. **61 of the original 64 protected hashes now match; two migration candidates and .temp/cli-latest differ from the older snapshot.** They were captured before resumed verification; no current SQL/deployment correctness is inferred from the original hashes or mocked tests. Source inspection still finds the existing UUID/versioned save contract, draft authorization and default-false editor setting.

Docker is now discoverable, but CORE_TEST_PG_BIN remains unset and PostgreSQL executables are absent from PATH. Neither existing SQL suite executes without its approved binary directory; Docker/container/installed database state was not inspected or used. Actual SQL/RLS/locking and isolated Supabase acceptance remain prerequisites. No live project inspection, CLI deployment, migration application, account mutation, Storage operation or gate enablement was performed. Deployed state remains unverified. See the phase record for scope evidence and the exact deployment checklist. Phase 05 is locally complete; Phase 06 has not started.


### Phase 06B local integration — 2026-10-16

See [PHASE_06_LOCAL_INTEGRATION.md](PHASE_06_LOCAL_INTEGRATION.md). Existing CORE was inspected read-only; an independent disposable Supabase stack hosted controlled Auth/RLS/Storage/Edge checks and was then removed. Three focused groups produced **24 passed / 2 failed out of 26 acceptance checks**. Both failures concern gateway wildcard CORS headers; direct function exact-origin behavior and POST origin/JWT/role rejection were confirmed. Admin read operations passed and privileged writes remained disabled. Fixture PostgREST/Storage versions differ from CORE, so matching-runtime acceptance is still pending.

Corrected only local db.major_version from 15 to the verified runtime 17; no existing data, migrations, policies, accounts, gates, remote resources or deployments changed. Prior isolated PostgreSQL suites now have **2 passes / 0 failures / 0 skips**, superseding historical missing-binary notes without rewriting those records; they were not rerun here. Current frontend configuration still selects remote Supabase and was preserved without contacting it. Existing CORE Edge remains stopped; optional Vector logging still cannot reach Docker API port 2375.

**Phase 06 is not ready to close.** Next: deliberately select local frontend configuration, resolve exact-origin gateway behavior through reviewed configuration, and verify guarded Edge/CMS/catalog flows on matching versions with all sensitive switches false. Production target-state/deployment/SMTP and privileged-operation acceptance remain separately required. No Phase 07 work started.


### Phase 06C targeted local acceptance — 2026-10-16

See [PHASE_06C_FINAL_ACCEPTANCE.md](PHASE_06C_FINAL_ACCEPTANCE.md). Added explicit local-only dev/edge/cors tooling: temporary matching local Vite credentials, guarded existing Edge startup, and a validated scoped Kong Functions CORS removal/hot reload. Allowed/forbidden wire headers and JWT rejection now pass on existing CORE. No existing data, policies, migrations, accounts, receipts or gates changed; .env.local is preserved. The generated gateway adjustment must be reapplied after container recreation.

Three focused groups finished with **21 distinct final passes / 0 unresolved assertions**; two persisted native regressions overlap those cases. Matching disposable PostgreSQL/Auth/PostgREST/Storage/Edge images passed real role, Storage and guarded Edge tests; actual browser services passed session restoration, published catalog refresh, media URLs, CMS taxonomy/content and editor navigation. Initial fixture ES256 configuration failures were corrected and affected checks rerun; a memory-related browser interruption was followed by one successful bounded retry. Disposable resources were removed. Previously passed SQL suites were not rerun.

**Phase 06 remains open:** existing CORE authenticated acceptance requires an approved controlled local session, and a diagnostic disclosure of local gateway key material requires operator containment/rotation review. No remote credentials were disclosed or remote resources contacted. An unrelated .env.example change detected during the task was preserved. Local Edge and Vite on port 5191 are running with admin flags false; editor writes remain false. Production target/deployment/SMTP/privileged-operation acceptance is separate. Phase 07 has not started.


### Phase 06D final local decision — 2026-10-16

**LOCAL PHASE 06 BLOCKED.** See the appended Phase 06D section in [PHASE_06C_FINAL_ACCEPTANCE.md](PHASE_06C_FINAL_ACCEPTANCE.md). The user confirmed no authorized existing local test session; authenticated CORE acceptance was stopped without account access/modification. Credential review classified the exposed publishable/anon values as public and the secret API key/service_role JWT as privileged. Exact values persist in the original tool-output session records and a copied user message in a second session; no exact matches were found in inspected Git working-tree/index/HEAD content, 58 untracked files or relevant ignored phase artifacts. Sharing/upstream retention cannot be determined locally.

Operator containment and coordinated invalidation of both privileged credential forms are required; rotating only the modern alias is insufficient. No rotation or recreation was performed. Existing Kong CORS operator tooling remains the repeatable procedure after authorized recreation; one real wire group passed all five cases in about 2.6 seconds. Vite/Edge are running and all sensitive gates remain false. Only these two existing documents were updated. Production readiness is unverified; Phase 07 has not started.


### Final Phase 06 handoff — 2026-10-16

**PHASE 06 LOCAL BLOCKED: OPERATOR ACTION REQUIRED.** The final section of [PHASE_06C_FINAL_ACCEPTANCE.md](PHASE_06C_FINAL_ACCEPTANCE.md) supersedes the earlier unavailable-Visitor/unrotated-Auth status. Exactly one expressly authorized Visitor was created by normal local registration and retained as user. Actual CORE frontend login/logout, profile/session restoration, catalog loading and Visitor CMS/privileged-operation denials passed; draft/profile queries exposed no additional rows. The catalog is empty (six categories/eight sections); exhibit/bilingual and image/GLB checks remain explicitly skipped, along with positive Admin/editor acceptance requiring another authorized session.

The operator approved supported Auth/API maintenance. A DPAPI-encrypted complete database/globals, Storage and runtime/config backup passed decrypt/hash verification. CLI-supported Auth env overrides plus approved stop/start preserved database/Storage volumes, pinned essential images, asymmetric keys, data and all five migrations. Old modern secret and legacy service JWT are rejected; replacement credentials and a fresh Mailpit login for the same Visitor work. New working secrets are ignored/user-ACL-protected, absent from frontend output, and .env.local is unchanged. Vite/Edge/exact CORS are restored; all gates remain false.

Two focused groups: **14 final functional/health passes, zero unresolved failures, four skips**; rotation also passed 17 maintenance assertions, under ten minutes direct testing/maintenance. Source, visuals, migration history and unrelated work were preserved. Remaining operator-only requirements: contain retained disclosure records/network access; authorize a supported database/S3-default and development signing-material hardening/invalidation procedure (not rotated here); retain or resolve empty-content acceptance limits; complete separate administrative/production acceptance. This is the final Phase 06 decision and finite handoff to Phase 07; Phase 07 has not been started and no further Phase 06 development iteration is proposed.
