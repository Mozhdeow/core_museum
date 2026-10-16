# CORE — Phase 05: Admin CMS & Exhibit Management

Implementation date: 2026-10-15. Completion rechecked: 2026-10-16. Safe local implementation and verification are complete. Production security acceptance remains blocked as recorded below. No deployment, real data changes or gate enablement was performed. Phase 06 has not started.

## Phase name

Phase 05 — Admin CMS & Exhibit Management.

## Goal

Complete the existing exhibit workspace with database taxonomy, reliable browsing, bilingual specifications and galleries, metadata validation and clear save/publication feedback. Preserve the Phase 01 integrity pipeline, Phase 02 catalog/scene flow, Phase 03 asset validation and Phase 03B/04 security contracts.

## Existing implementation confirmed and proposed changes

Read PROJECT_BACKEND_OVERVIEW and the Phase 01, 02, 03, 03B and 04 records before editing and presented the assessment/plan. Inspection covered actual admin pages, domain/service contracts, Auth/content access, five migrations, RLS/RPC definitions, Storage services and existing tests. The existing application already had:

- Supabase Auth/protected profiles, staff routes and current-role/capability checks.
- Stable exhibit UUIDs, loaded updated_at versions and atomic save_museum_item metadata/child updates.
- Explicit draft-first creation, recoverable draft retries, uncertain-result handling and reference-aware cleanup after confirmed commits/deletions.
- Validated image/GLB selection, fresh associated paths, previews and real operation stages.
- A published/active museum catalog with explicit refresh and existing selected-model rendering.

Missing work was localized to hardcoded category/section selectors, full-list/client-only search, incomplete bilingual specification controls, gallery preparation and metadata feedback. A concise assessment/plan was presented before changes: extend existing services and forms, keep UUID/version semantics, require valid active placement for publication, and leave migrations/gates/landing/scenes alone. Risks included stale taxonomy, concurrent edits, partial uploads, unknown results and the still-unverified database security guards.

## What was implemented

### Database-driven taxonomy and exhibit browsing

- MuseumItemsService now exposes page(query) and taxonomy(), retaining catalog/list/get/save/remove. The existing Supabase adapter and item mapper remain authoritative.
- Taxonomy loads authorized categories/sections in database sort_order/id order using counted range requests, retaining real UUIDs, slugs, both names and active/available state. It traverses REST caps rather than silently keeping only the first response.
- Selectors use real UUID values and the current locale, with English fallback for missing localized text. New choices are active only. An existing inactive choice remains visible and disabled; a deleted/missing choice is explicitly unavailable. Drafts can be unassigned.
- Staff listing has explicit search submission across English/Persian titles, slug and brand; combinable status/category/section/unassigned filters; visibly different draft/published badges; exact totals; and 10/25/50 item pages. Search/filter/page-size changes reset to page one. The database order is sort_order then UUID.
- Search is a bounded, escaped literal case-insensitive regex, with separately quoted PostgREST values. Characters such as percent, underscore, asterisk, comma, quote, parenthesis and backslash cannot add filters or become user-supplied regex operators. SDK transport tests cover this encoding; real managed-service acceptance is still required.
- CMS pages hydrate ordered specifications and galleries with counted range reads, so a page of many exhibits does not silently truncate child records at the REST row cap. A page missing rows relative to its exact total fails explicitly. Missing counts, denied reads and incomplete taxonomy produce errors rather than empty success.
- Editing loads the requested UUID directly through get(id), independent of the listing page or server list cap. Loading, unavailable, denied and failed-load states cannot become an editable blank exhibit.
- CMS results are scoped to resource, authenticated ID and role, and discard stale responses. A late deletion result from a previous account cannot start an obsolete list refresh. Failed/unknown deletion attempts require an explicit successful refresh before another attempt. An out-of-range/deleted page has a first-page recovery action, including from the error state.

### Exhibit editing, validation and publication

- Specifications support add/remove/up/down, English and Persian labels and the existing shared value field. New exhibits start with an empty specification list, without fabricated category/section or thumbnail assignments.
- Existing galleries retain IDs and Storage paths while captions/order/removals are staged for one save. Newly selected gallery files support bilingual captions and ordering within the selected batch. These files append after retained gallery entries, in the chosen batch order. A subsequent edit can interleave all saved entries. Picker previews still describe file selection rather than the committed gallery.
- The existing AssetPicker and Storage adapter are reused without modification: image decoding, GLB inspection, stale-selection protection, fresh paths, no overwrite, resource cleanup and upload stages remain in force. No second upload implementation or WebGL preview was added.
- Shared normalizeExhibit validation runs in both the form and saveExhibit before database writes or uploads. Pending gallery captions use that same validation. Validation clones/trims metadata and preserves identity, version, association IDs, gallery IDs/paths and feature fields.
- Required: slug, both titles, and both labels plus value for each specification. Slugs reject whitespace, slash/backslash, query and fragment characters; Unicode is preserved. Years are whole numbers 0–9999 (0 retains legacy unknown-year semantics); sort order is a signed 32-bit whole number.
- Limits: slug/brand/spec labels 200 characters; titles/creator 300; short descriptions/captions 1,000; descriptions 30,000; specification values/attribution 2,000; source URL 2,048; source platform/license 200; up to 100 specifications and 100 combined retained/new gallery images. Source URLs must use HTTP(S) without embedded credentials. Required attribution requires text. Optional metadata can be cleared, including the previously sticky source URL. Existing nonstandard license values are preserved.
- English/Persian validation summaries identify fields, focus feedback once when an error changes, and mark key invalid controls. Taxonomy/save errors, confirmation, cleanup warnings, retained drafts and uncertain outcomes remain distinct.
- Nonempty taxonomy UUIDs are authoritative even if their slugs change or are reused. Explicit empty IDs mean null; only legacy callers omitting IDs may resolve a slug. Missing IDs never fall back to another row sharing an old slug.
- Before saving, the service rereads selected taxonomy. Drafts can retain their original inactive association, but cannot newly select an inactive association. Publication requires an existing active category and section. Thumbnail/model files remain optional, preserving Phase 02's explicit missing-model fallback.
- Admins draft/publish/unpublish through the same versioned save, with no separate status write. Editors retain draft-only forms, no published edits, publication option, deletion or featured controls. Missing/false server capabilities keep editor saves/uploads disabled.
- Conflicts retain local edits and offer an explicit discard-and-reload of the latest exhibit and files. A failed create retains and retries the same draft UUID/version in update mode. An uncertain commit disables blind resubmission and directs the user to inspect the list. Local field changes and gallery controls never autosave.
- Success explains that published museum changes require an explicit catalog reload. Tests exercise create, publish, edit and unpublish through the real client/service pipeline against intercepted responses: cached catalog contents remain unchanged until forced reload, then reflect saved published data and exclude drafts.

## Files changed

This inventory is Phase 05 only. Earlier uncommitted work is preserved.

| File | Change |
| --- | --- |
| src/types/services.ts | Page/query/taxonomy contracts on the existing service |
| src/lib/services/supabase/contentQueries.ts | Counted, ordered, escaped SDK queries and paginated child/taxonomy reads |
| src/lib/services/supabase/exhibitValidation.ts | Shared metadata normalization, validation issues and immutable reordering |
| src/lib/services/supabase/SupabaseMuseumItemsService.ts | Existing mapper/hydration reused for pages, taxonomy and direct UUID loading |
| src/lib/services/supabase/itemIntegrity.ts | Validation, authoritative UUID placement and optional pending gallery captions before the existing save pipeline |
| src/lib/services/errors.ts | Translate direct/wrapped CMS validation errors |
| src/lib/services/mockServices.ts | Keep the unused prototype adapter compatible with the extended interface; not a production fallback |
| src/hooks/useCmsData.ts | Resource/session-scoped CMS reads and explicit refresh |
| src/pages/Admin/AdminPages.tsx | Extend existing exhibit form; retain other admin pages and export the listing |
| src/pages/Admin/ExhibitList.tsx | Extract/complete the existing listing with database queries, states and recovery |
| src/pages/Admin/TaxonomySelect.tsx | Shared localized UUID selector with active-state behavior and explicit accessible labels |
| src/i18n/locales/en/admin.json and src/i18n/locales/fa/admin.json | Matching CMS controls, feedback and validation |
| tests/admin-cms.test.ts | Actual SDK transport/query and pure validation regressions |
| tests/admin-cms.spec.ts and tests/admin-cms.playwright.config.ts | Local browser CMS workflows using intercepted HTTP responses |
| tests/backend-integrity.test.ts | Carry-forward integrity plus taxonomy, publication and pending-caption regressions |
| tests/backend-admin.spec.ts | Preserve previous regressions; adapt service fixtures and cover pending gallery metadata |
| tests/auth-roles.spec.ts | Preserve all role tests with the extended page/get/taxonomy fixture contract |
| package.json | test:cms using existing Node test tooling; no dependency changes |
| docs/backend/PHASE_05_ADMIN_CMS.md | This phase record |
| docs/backend/PROJECT_BACKEND_OVERVIEW.md | Append current status and future prerequisites without rewriting history |

Captured 139 pre-phase file hashes. At the original completion check, Auth, routing, museum/landing sources, Storage validation/adapter, AssetPicker, Supabase files and earlier phase records matched the recorded protected snapshot. The resumed check below qualifies that historical statement for later, pre-existing migration/CLI edits. The original useMuseumItems hook is retained for compatibility. No unrelated working-tree changes were reverted.

## Database changes

None. No new migration, schema/constraint/function/RLS modification, seed, repair or data rewrite. The existing UUID foreign keys and slug constraints remain. save_museum_item retains its inspected transaction, SECURITY INVOKER, row/version checks and atomic child replacement. Phase 03B must still precede Phase 04. Phase 05 did not edit or apply either migration. Both files have later edits already present at the resumed check; they were preserved, and their deployment state was not inspected or certified.

CMS metadata/placement validation is an application rule on the high-level save path, not a new SQL constraint. Authorized direct database clients and legacy low-level helpers do not acquire these new content-quality checks automatically. RLS/RPC/direct-write role authorization remains the database security boundary from Phase 04 and is still awaiting actual PostgreSQL acceptance. A taxonomy activation change concurrent with an administrator save is not covered by a new database transaction/constraint; refresh and reconcile if placement changes.

## Supabase changes

No deployed changes, CLI push/deploy, SQL execution against a linked project, account mutations, invitations, secrets, bucket changes, production uploads or cleanup. Supabase is still the sole backend. No dependency installation, Node/Express server or browser service credential was introduced.

CORE_ADMIN_WRITES_ENABLED and CORE_ADMIN_GUARDS_VERIFIED remain opt-in/default false; editor_writes_verified remains false in the unapplied migration. No sensitive switch was enabled. Deployed settings/state were neither inspected nor changed. Controlled test fixtures exercise permitted/denied branches without enabling real gates.

## Architecture decisions

Keep one integrity implementation and existing interface facade. Services validate metadata/association identity before side effects; UI adds feedback but cannot confer permissions. Keep file validation, transactional metadata saving and conservative cleanup as distinct existing boundaries. The only backward-compatible SaveOptions addition is optional galleryCaptions aligned with files.gallery; callers omitting it retain blank new-image captions.

Use explicit server queries and counts instead of filtering the first bulk response. CMS child/taxonomy reads traverse caps; publication catalog behavior is retained. Explicit search submission avoids a request per keystroke. Offset pagination is deterministic for a stable dataset, not a cross-request snapshot; edits can move rows between pages and require refresh. Query code follows [Supabase range](https://supabase.com/docs/reference/javascript/range), [raw OR filtering](https://supabase.com/docs/reference/javascript/or) and the official [PostgREST operator/URL grammar sources](https://github.com/PostgREST/postgrest/tree/main/docs/references/api).

Keep catalog refresh explicit; CMS success does not mutate the museum store or reset a live scene. Keep source/gallery metadata on the existing domain shape; technical values remain one shared string and both labels are localized.

## Security considerations and permission matrix

The following is the intended existing Phase 04 matrix, preserved locally, not a claim of verified deployment:

| Operation | Visitor / database user | Editor | Admin |
| --- | --- | --- | --- |
| Published/active museum catalog | Yes, authenticated | Yes | Yes |
| Staff drafts/list/form | No | Draft workspace | All exhibits |
| Create/edit draft + associated fresh upload | No | Only when verified editor gate is enabled | Yes |
| Edit a published exhibit or publish/unpublish | No | No | Yes |
| Delete exhibits / manage taxonomy | No | No | Yes |
| Storage overwrite/delete or superseded-file cleanup | No | No; retained/reported | Existing reference-aware safeguards |
| User/privileged role administration | No | No | Existing guarded Edge contracts; sensitive gates remain off |

Database roles still come from protected profiles/current Auth eligibility. Registration cannot select a privileged role. Frontend guards, filters and metadata validators are UX/content checks, never RLS bypasses. No policy, role-assignment, self-protection, last-admin lock, operation receipt or ban/session behavior was weakened.

Existing public draft-media URLs remain public. An editor's inability to prove complete reference visibility retains cleanup candidates. Failed/uncertain writes never authorize deletion of current referenced assets. No orphan sweep, bulk deletion, automatic rollback of confirmed rows or blind retry was added.

## Tests and verification

Native verification: **113 passed, 2 explicitly skipped real PostgreSQL tests**:

| Suite | Passing cases |
| --- | ---: |
| Backend integrity | 41 |
| CMS metadata/query transport | 12 |
| Museum state/flow | 11 |
| Storage validation/path/loader | 14 |
| User management contracts/handler | 25 |
| Auth/roles/session contracts | 10 |

Browser verification using installed Edge:

| Suite | Result |
| --- | --- |
| CMS | 13 passed |
| Existing exhibit/admin UI | 15 passed |
| Auth/RBAC/navigation | 12 passed |
| Guarded user management | 15 passed |
| Museum integration/scenes | 11 passed |
| Landing, production preview | 20 distinct cases passed: 19 in the full run, reduced-motion case on unchanged isolated rerun |

TypeScript typecheck and final production build pass. Targeted Phase 05 ESLint passes without warnings. Full ESLint retains only the two pre-existing protected LandingIntro.tsx react-hooks/set-state-in-effect errors at lines 291 and 612 (zero new warnings/errors). Existing large-chunk, ineffective dynamic import and Three/shader/deprecation diagnostics remain. Main JS: approximately 1,992.77 kB, 573.20 kB gzip. git diff --check and phase-file whitespace checks pass. All 64 protected existing files matched at the original check; see the resumed verification below for current exceptions.

Native tests execute actual orchestration/query-building with controlled clients/fetch; browser CMS tests use the actual SDK and services against intercepted responses. Prior role/UI fixtures remain mocked. None proves real PostgreSQL syntax, RLS, locking, Auth Admin, Storage HTTP bytes or managed deployment safety. Initial new-test issues with exposed count headers, exact select labels, option-disabled assertions and StrictMode request counts were corrected; these are not pre-existing application failures. The final complete CMS run passed all 13 cases, including the previously focused account-switch case; reruns are not counted twice.

**Total: 199 distinct passing tests and 2 skipped real PostgreSQL integration tests.** The first full landing run had one byte-for-byte reduced-motion canvas screenshot mismatch; its unchanged isolated rerun passed. This timing-sensitive assertion remains a test reliability risk, not a proven new CMS or landing regression. No landing source, test, wait or tolerance was changed. The other 19 landing cases passed in the full run. Repeated runs are not counted twice.

Both SQL suites originally skipped because CORE_TEST_PG_BIN was unavailable. At that original check no initdb/pg_ctl/psql or Docker was discoverable on PATH, and the previously identified PostgreSQL 18 bin directory had no usable executables. Docker is now discoverable on the resumed check; this does not satisfy the existing binary-based test contract or verify guards. Installed database data was not accessed and nothing was installed. Mocked results are not substitutes for these blocked tests.

Reproduction using existing tools:

```powershell
node --test tests/backend-integrity.test.ts tests/admin-cms.test.ts tests/museum-integration.test.ts tests/storage-assets.test.ts tests/admin-users.test.ts tests/admin-users-sql.test.ts tests/auth-roles.test.ts tests/auth-roles-sql.test.ts
npm run typecheck
npm run lint
npm run build
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npx playwright test --config tests/admin-cms.playwright.config.ts
npx playwright test --config tests/backend-admin.playwright.config.ts
npx playwright test --config tests/auth-roles.playwright.config.ts
npx playwright test --config tests/admin-users.playwright.config.ts
npx playwright test --config tests/museum.playwright.config.ts
# Start an owned production preview at port 5199 before this command.
$env:PLAYWRIGHT_PORT = '5199'
npx playwright test --config tests/landing.playwright.config.ts
git diff --check
```

Run dev-server browser suites sequentially; editing sources/documents or sharing the dev optimizer while a suite runs can reload fixture sessions. Production-preview tests read the frozen dist build. All test actors/files are controlled fixtures; no real user account or database was modified.

## Resumed completion verification — 2026-10-16

Read this phase record and the backend overview; inspected the existing CMS queries, resource/session hooks, UUID selectors, form/save path, service mapper, current migration/RPC contracts and recorded test logs. Completed features were retained. No confirmed remaining CMS application defect was found, so no application source, test, migration, policy, gate or dependency was changed during this resumed verification. Only this record and PROJECT_BACKEND_OVERVIEW were corrected for documentation drift.

Fresh checks on the resumed tree:

- Native suites: **113 passed, 2 real PostgreSQL cases skipped**. CORE_TEST_PG_BIN is unset and initdb/pg_ctl/psql are not on PATH. Docker's executable is now on PATH, but its engine/containers/databases were not inspected or used; the existing isolated suites require the approved PostgreSQL binary directory. No integration-proof claim or gate enablement follows from Docker availability.
- CMS browser: **13 passed**, using an owned Vite server with explicit fake Supabase URL/publishable/anon keys and intercepted responses. No current local or remote Supabase project was used. Together these are **126 freshly passing cases**, not additional unique tests to add to the original 199-case inventory.
- TypeScript typecheck and production build pass. Full ESLint still reports exactly the two documented LandingIntro errors and zero warnings; no CMS lint errors. The recorded previous admin/RBAC/user/museum/landing browser results were checked, including the disclosed reduced-motion isolated rerun; those suites were not unnecessarily rerun in this verification.
- Final git diff --check, required phase-document structure, whitespace and resumed-tree scope checks pass: only the two backend documents changed relative to the initial resume snapshot; all incoming application, test and Supabase source files are preserved. Build/cache/test artifacts are local generated output, not deployment.

The original protected hash snapshot is not identical to the resumed tree. Of its 64 protected files, 61 still match; the two migration files below and the CLI's .temp/cli-latest already differed when this resume began. These migration differences are substantive, not only line endings. Additional branch/runtime metadata and an SQL snippet also predated resumed work. They are outside Phase 05's 22-file inventory and were not created, reverted or modified by this resumed verification:

- supabase/migrations/202610150001_admin_user_management.sql
- supabase/migrations/202610150002_auth_roles.sql

The current save_museum_item signature, UUID/version contract, draft authorization and default-false editor setting remain present in inspected source. That source inspection and mocked tests do not validate the changed SQL, actual deployment state, concurrency or real account permissions. An initial-resume hash snapshot is retained under the ignored .tmp/phase05 directory to verify preservation of the incoming tree. No Supabase CLI deployment/status command, live SQL, account operation, Storage write or privileged switch change was performed. Existing changes by other work are not evidence that Phase 05 deployed or approved them. The current migration candidates still require the separate real SQL and isolated Supabase acceptance process below.

## Known limitations

- Both actual 03B/04 PostgreSQL suites and isolated Supabase acceptance remain blocked. Editor writes and sensitive account operations stay disabled by default. Deployed schema, migration history, role guards, grants, managed Storage/Auth behavior and settings are unverified.
- New normalization limits/required bilingual metadata may reject invalid legacy content until an authorized editor/admin repairs the affected fields. No background rewrite occurs. Taxonomy quality/activation at a concurrent admin commit is not a new SQL invariant.
- Exact counts and literal regex search may need measured query/index optimization at scale. No index, extension or migration is installed. Offset pages can shift during concurrent edits; first-page recovery and explicit refresh are provided.
- Existing Phase 02 public catalog bulk reads still have their prior REST row-limit/scalability boundary. CMS pagination/child reads are improved without rewriting the public loader or rendering architecture. Validate catalog capacity before a larger rollout.
- New-image batches append after retained gallery entries; full cross-batch interleaving is available after their first successful commit. New file previews are picker selections, not a persisted gallery. Technical values remain shared between localized labels.
- Conservative orphan retention, public draft assets, physical phones/Safari, model optimization, the observed reduced-motion screenshot timing sensitivity and existing landing lint/bundle/Three warnings remain. This phase does not certify these independent concerns.

## Deployment prerequisites and future dependencies

1. Provide only an approved PostgreSQL binary directory containing initdb, pg_ctl and psql through CORE_TEST_PG_BIN. Require the actual Phase 03B and 04 isolated suites to execute and pass without skips. Never point tests at installed data or a production database URL.
2. Obtain separately authorized read-only target inspection: migration history, profile constraint/registration trigger, managed Auth/Storage columns, RLS/grants/RPC/guards, settings and recovery admin access. Capture backups/rollback definitions and review the complete dry-run scope. Phase 05 adds no migration to deploy.
3. In an isolated Supabase project, apply reviewed pending migrations in order (03B before 04), and deploy the matching guarded admin-users function/contracts with JWT verification, exact origins and approved redirects/SMTP. Keep all three sensitive switches false initially. Do not infer an existing linked CLI target is safe.
4. Verify anonymous/Visitor/editor/admin REST/RPC and Storage writes, role escalation denial, draft/published edits and publication races, child/version/slug integrity, registration/session changes, invitations/SMTP, self/last-admin guards, receipts/reconciliation and deletion/ownership/FK outcomes. Include actual shared/public/draft asset bytes and failed/unknown responses. Fixture SQL alone does not verify managed services.
5. Add CMS acceptance on that isolated target: exact count header exposure, range/error handling and row caps; literal bilingual search with punctuation; inactive/missing/renamed UUID taxonomy; full specifications/gallery hydration; draft/publish/unpublish and forbidden editor operations; failed uploads/RPC/deletions; concurrent edits; and public catalog refresh including capacity and model/media URLs.
6. Record acceptance evidence and operator rollback procedures. Only an authorized operator may enable each verified scope after its real checks pass. Production rollout remains separately authorized and begins with sensitive gates off. This phase performed none of these deployment/enablement steps.

## How future phases should use this information

Read this record and all earlier phase contracts before further work. Reuse page/taxonomy/get and the unified high-level save; keep real UUID associations, original loaded versions, shared validation, draft-first creation, staged gallery IDs/paths and conservative cleanup. Preserve active/published catalog filtering and explicit refresh. Never add slug-based identity, sequential child-write fallbacks, browser service credentials, editor file deletion, automatic receipt replay or a UI toggle that enables unverified permissions.

Phase 05's safe local CMS foundation is ready for subsequent local work. Production acceptance and security-sensitive enablement remain dependent on the blocked 03B/04 verification and isolated Supabase acceptance above. Phase 06 has not started.
