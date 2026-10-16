# Phase 01 — Backend Integrity & Critical Fixes

Date: 2026-10-13. Status: implementation complete; local verification recorded below. No deployment was performed.

## Goal

Repair the existing exhibit identity, save, media replacement and deletion paths without rebuilding CORE, changing the cinematic experience, or introducing another backend.

## Existing implementation confirmed

CORE already has Supabase Auth, a typed client, content/Storage adapters, an admin editor, six application tables, RLS/grants, public image/model buckets, and three versioned migrations. The previous audit identified slug-based upserts, separate metadata/spec/media requests, premature asset deletion and an unused transactional RPC.

The inspected `202609300003_atomic_item_save.sql` defines `save_museum_item` as SECURITY INVOKER. It requires an admin, locks an existing item by ID, optionally compares `expected_updated_at`, updates metadata and replaces ordered specs/gallery in one database transaction. It returns the ID. It does not create missing items and does not transact Storage operations.

Only `docs/landing-phase3.md` existed before this phase. There were no backend overview or phase documents to overwrite. That landing history was preserved.

## What was implemented

- Existing-item updates target the stable database ID through the existing RPC. Changing the slug does not insert an item; database uniqueness errors remain authoritative.
- The editor passes its originally loaded `updatedAt`. Missing/stale versions fail rather than silently using a newly fetched version. The RPC also checks for changes occurring during uploads.
- Creation explicitly inserts one unpublished draft by a generated/stable UUID, then uses the existing-item RPC to commit content, media references, children and the requested publication state. A failed creation can leave a recoverable draft; a known retained draft is retried as an update, not recreated.
- Every selected file is validated before draft creation/upload. Uploads use fresh names with `upsert: false`. Existing assets remain untouched until metadata commits.
- Gallery captions, ordering and removal in the editor are local changes until Save. They participate in the same RPC instead of racing it through immediate writes.
- Cleanup candidates are limited to removed/superseded references or newly attempted uploads from the current operation. Paths are paired with their bucket and deduplicated. Unchanged thumbnail, model and gallery references are retained.
- Before cleanup, the client verifies admin visibility and checks all relevant item/gallery references, including shared references. Query errors, missing counts, lost permissions and Storage failures retain files. Cleanup failures are returned separately from successful database operations.
- Item deletion snapshots references, checks all snapshot errors, deletes the database item with a version condition, confirms a returned row, and only then attempts cleanup. Gallery deletion uses the authoritative stored path and commits the gallery change through the RPC before cleanup.
- An unknown/lost insert or RPC response is treated as an uncertain outcome. Newly uploaded files are retained when a save may still commit, and the editor blocks blind resubmission until the item is reopened. Explicit PostgreSQL transaction errors allow guarded cleanup of attempted uploads.
- Existing feature flags and model metadata are preserved. Compatibility helpers now use the transactional save mechanism rather than destructive sequences of child writes.
- Error/status text covers conflicts, retained drafts, uncertain saves and cleanup warnings in English and Persian. Admin form state resets when moving between route targets; edit data cannot leak into a new-item form.

## Files changed

| File | Responsibility |
| --- | --- |
| `src/lib/services/supabase/itemIntegrity.ts` | Dependency-injected integrity orchestration, optimistic saves and guarded cleanup |
| `src/lib/services/supabase/SupabaseAdminService.ts` | Connect existing admin API to integrity implementation; preserve taxonomy/count/user functions |
| `src/lib/services/supabase/SupabaseStorageService.ts` | Expose existing validators for complete preflight validation |
| `src/lib/services/supabase/SupabaseMuseumItemsService.ts` | Forward explicit create/update options |
| `src/types/services.ts` | Optional create/update mode on the existing item service |
| `src/pages/Admin/AdminPages.tsx` | Unified saves, local gallery edits, failure recovery and cleanup reporting |
| `src/i18n/locales/en/phase2.json`, `src/i18n/locales/fa/phase2.json` | Backend operation messages; namespace name is historical |
| `package.json` | `test:backend` script using Node's built-in test runner |
| `tests/backend-integrity.test.ts` | Isolated service regression tests |
| `tests/backend-admin.spec.ts`, `tests/backend-admin.playwright.config.ts` | Admin browser behavior tests with simulated services and blocked Supabase traffic |
| `docs/backend/PHASE_01_BACKEND_INTEGRITY.md` | This phase record |
| `docs/backend/PROJECT_BACKEND_OVERVIEW.md` | Backend contracts and future-phase guidance |

Two unrelated working-tree edits appeared during implementation in `src/features/landing/journey.css` and `src/features/landing/sections/AboutCoreSection.tsx`. They were not made or reverted by this phase. Landing/animation code, museum routing and Auth/RLS configuration were not edited by this phase.

## Database changes

None. Existing migrations, function definitions, grants, indexes and constraints were preserved. No destructive migration, migration application, seeding or bulk deletion was performed.

## Supabase changes

None to deployed resources. No live content, bucket, policy, user or configuration mutation was performed. Tests use injected doubles or browser service stubs; the browser suite blocks Supabase-host requests. Local code now consumes the already-defined RPC. Its deployed presence/signature, deployed policies and grants must be verified before release. Missing RPC support fails; there is no sequential-write fallback.

## Architecture decisions

1. Retain the existing Supabase-only architecture and service facade. The integrity factory is a small internal test seam, not a new backend or a parallel content system.
2. Use explicit creation mode for new records with client-generated IDs. A nonempty ID defaults to update and a missing existing item never falls back to insertion. Slugs remain editable unique attributes.
3. Require a loaded version for existing-item saves. Compatibility partial-update helpers take their snapshot immediately before the RPC; interactive editors must use `saveExhibit` with their original loaded version.
4. Keep the initial draft insert separate because the existing RPC only updates. Preserve a recoverable unpublished draft instead of pretending all creation steps are atomic or destructively compensating by deleting it.
5. Prefer retained/orphaned files over broken database references. Storage cleanup is best effort and cannot undo a database commit.
6. Stage gallery editing in the form and commit once. Cancel no longer changes gallery data in the database.

## Security considerations

- Existing publishable-key client, Auth, SECURITY INVOKER RPC and RLS remain the security boundary. No service-role secret, Node backend, Express server or Edge Function was introduced.
- A zero-reference check is only meaningful with admin visibility. Cleanup fails closed when that cannot be established.
- Caller-supplied gallery deletion paths are ignored; authoritative database references determine candidates.
- No item-folder sweep or bulk cleanup is executed. Public bucket behavior remains unchanged; this phase does not make draft assets private.
- Local test doubles do not certify deployed RLS behavior. Verify with appropriately isolated anonymous, visitor and admin sessions before production acceptance.

## Verification

- `npm run test:backend`: 29 passing tests. Covers ID/slug changes, uniqueness, failed child commits, missing versions/IDs, upload and RPC failures, concurrent saves/deletes, independent media replacement, shared references, failed reads/deletes/cleanup, lost responses and draft recovery.
- `npm run typecheck`: passed.
- `npm run build`: passed. Existing large-chunk and ineffective dynamic-import warnings remain.
- ESLint on phase source/test files: passed. Full-project ESLint has the two pre-existing `react-hooks/set-state-in-effect` errors in protected `LandingIntro.tsx` at lines 298 and 619; they were not suppressed or changed.
- Admin browser checks: 5 passed on Edge (23.4 seconds). Covers stable ID/version forwarding, deferred gallery changes, failed-save preservation, draft retry as update, uncertain-save resubmission blocking, cleanup warnings and edit-to-create state reset. Initial test timeouts were caused by button-label capitalization in the test selector; the corrected suite passed.
- No live database transaction, production upload or deployed RLS test was run. The service fake models the inspected RPC; it tests client orchestration rather than executing PostgreSQL.

The built-in TypeScript test runner uses the installed Node 24 runtime. It is development tooling, not an application backend. Browser tests use installed Edge via `PLAYWRIGHT_CHANNEL=msedge` and an owned local Vite server on port 5192 by default.

```powershell
npm run test:backend
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npx playwright test --config tests/backend-admin.playwright.config.ts
npm run typecheck
npm run lint
npm run build
```

`git diff --check` also passed. Existing development warnings from Three.js/Drei (Clock and shadow-map compatibility) were observed during browser setup; this phase did not alter the 3D dependencies or scenes.

## Future dependencies and known limitations

- PostgreSQL and Storage do not share a transaction. Failed operations may retain a draft or orphan files. `SaveResult`/`ExhibitSaveError.cleanup.retainedAssets` expose candidates for investigation; no durable cleanup queue or automatic retry worker exists.
- Reference checks and Storage deletion are separate requests. They are not a global atomic garbage collector. A concurrent external writer that reattaches a path after the check is a remaining race; future arbitrary/shared-asset workflows need verified server-managed coordination or deferred cleanup. Existing version guards and item-scoped constraints reduce this risk for CORE's normal editor path.
- The low-level `saveItem` helper commits metadata only. It requires an ID/version and does not own uploaded files or perform upload compensation; prefer `saveExhibit` for complete workflows.
- New-item creation is intentionally two database stages. Known failed drafts are recoverable. If the initial insert response is lost, inspect the item list before retrying.
- Spec IDs are regenerated by the existing RPC. Gallery IDs are preserved. Future systems must not assume specification IDs are permanent.
- Museum progression, taxonomy-driven rendering, model fitting, private draft media and privileged account administration remain outside this phase.

## How future phases should use this information

Use the overview's contracts and this phase's regression tests as the starting point. Preserve ID-based updates, original loaded versions, local gallery staging and post-commit cleanup. Do not restore slug upserts, pre-delete Storage operations or status changes before a successful full commit. Verify deployed Supabase state before proposing any migration/resource change. Phase 02 has not started.
