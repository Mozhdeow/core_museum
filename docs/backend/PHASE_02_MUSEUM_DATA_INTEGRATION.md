# CORE — Phase 02: Museum Data Integration & Dynamic 3D Content

## Phase name

Phase 02 — Museum Data Integration & Dynamic 3D Content. Date: 2026-10-13. Implementation and local acceptance checks completed. Production acceptance remains incomplete until authenticated Supabase/schema/RLS verification is available.

## Goal

Connect the existing Supabase content system to the existing 3D museum without rebuilding the application, changing route/auth requirements, replacing the cinematic landing or weakening Phase 01 integrity protections.

## Before/after data flow

Before: MuseumPage and MuseumCanvas independently fetched items. Canvas rendered `items[0]`, while the information panel selected a hardcoded GPU slug. Only a non-fixed Canvas mounted the controller, but the museum uses a fixed Canvas. Section names/progress totals were hardcoded.

After: existing Supabase service facade → published catalog plus active taxonomy → one authenticated-user-scoped museum store → ordered journey stops and stable selected exhibit UUID → both the existing Canvas and information panel. MuseumLayout owns the single scroll controller and catalog load. The fixed Canvas is presentation only. Auth backgrounds use the procedural scene and no longer query museum content.

## What was implemented

- `MuseumItemsService.catalog()` reuses the existing Supabase adapter, domain mapper and Storage URL construction. It explicitly queries published items even for admin visitors and active categories/sections. Existing admin list/save behavior remains separate.
- Shared taxonomy queries run alongside the item query and are reused during mapping. Specification/gallery requests run only when items exist. Empty sections and their bilingual descriptions are available even when no exhibits exist.
- The store defensively excludes unpublished items and exhibits associated with non-null taxonomy IDs outside the active/visible catalog. Items with null taxonomy associations use localized unassigned/uncategorized labels; no database content is fabricated.
- Catalog loading is owned by MuseumLayout, cached for one authenticated user and deduplicated during pending/StrictMode loads. Owner changes and forced retries invalidate old request generations. Slow old responses cannot overwrite newer data. Explicit reload is available for data changes; there is no production mock fallback.
- Journey stops follow section sort order, then item order and UUID tie-breaking. Empty sections have a stop with no exhibit. Unassigned items follow the real sections. Scroll and accessible select/previous/next controls use the same stop index and UUID selection.
- Fixed Canvas layout is retained. A layout-owned ScrollTrigger updates progress, is refreshed when stop count changes, and kills only its owned instance on unmount. A new museum visit starts at zero rather than inheriting the landing's long scroll range. Navigation jumps directly to its target to avoid loading intermediate GLBs.
- The Canvas and details use the same selected item. Selection changes do not remount Canvas, and old model-status callbacks are ignored unless ID and URL still match.
- GLBs load on demand through the existing `useGLTF` cache. Cloned nodes/skinned skeletons are fitted using finite bounds to a radius of 1.65 in the existing camera composition. Empty/nonfinite geometry falls back safely. Local skeleton resources are disposed on unmount; shared cached geometry/materials/textures are not disposed.
- The error boundary is keyed by exhibit ID, URL and retry revision. Missing, slow, unavailable, malformed and invalid-URL models use an explicit procedural display with localized status. Retry clears only the failed URL's loader cache before remounting its model subtree. It does not rebuild Canvas or refetch the catalog.
- Existing details now show actual bilingual title/description/category/section/specifications, available thumbnail, brand/year and attribution metadata. Gallery/AI feature flags are respected. Overlays reset with exhibit selection. No unsupported historical facts or exploded-view capability are invented.
- Loading, collection error, empty collection and empty section are distinct states with appropriate reload behavior. Reduced motion retains navigation while disabling object rotation, Float/parallax and continuous rendering. DPR remains capped at 1.6.
- Added localized museum statuses/navigation labels and repaired four existing corrupted Persian museum strings. Existing visual classes, camera, lighting, fog, particles and procedural object were preserved. No new physical rooms were built.

## Files changed

| File | Why |
| --- | --- |
| `src/types/museum.ts` | Catalog/category types and bilingual section descriptions/slug |
| `src/types/services.ts` | Published catalog contract on the existing service |
| `src/lib/services/supabase/SupabaseMuseumItemsService.ts` | Published/active catalog reads, shared taxonomy and section UUID mapping |
| `src/lib/services/mockServices.ts` | Keep the unused prototype adapter compatible with the expanded interface; no production fallback |
| `src/features/museum/museumState.ts` | Testable catalog/request/selection/model-state implementation |
| `src/features/museum/museumStore.ts` | Bind the existing store to the existing service facade |
| `src/hooks/useMuseumCatalog.ts` | Single route-owned load scoped to authenticated user |
| `src/hooks/useMuseumJourney.ts` | Fixed-layout independent scroll ownership and navigation |
| `src/experience/modelGeometry.ts` | URL checks and finite bounding-sphere fitting |
| `src/experience/MuseumCanvas.tsx` | Presentation props; remove duplicate fetching/controller; preserve Canvas |
| `src/experience/MuseumScene.tsx` | Selected GLB, cloned/fitted scene, loading/error recovery and reduced motion |
| `src/layouts/MuseumLayout.tsx` | Catalog owner, dynamic taxonomy/progression and existing-style navigation controls |
| `src/pages/Museum/MuseumPage.tsx` | Real selected metadata, feature flags, statuses/retry and selection-scoped overlays |
| `src/i18n/locales/en/museum.json`, `src/i18n/locales/fa/museum.json` | Bilingual integration UI/status text |
| `package.json` | `test:museum` using existing Node tooling |
| `tests/museum-integration.test.ts` | State, visibility, stale requests, cache and model-fitting regression tests |
| `tests/museum-integration.spec.ts` | Real SDK/service mapping with controlled REST/GLB responses and browser behavior |
| `tests/museum.playwright.config.ts` | Isolated owned local test server and installed browser support |
| `docs/backend/PHASE_02_MUSEUM_DATA_INTEGRATION.md` | Phase record |
| `docs/backend/PROJECT_BACKEND_OVERVIEW.md` | Current museum operational contracts; retain Phase 01 history |

Phase 01 files and unrelated working-tree changes were preserved. Concurrent edits appeared in landing CSS, About, Hero, landing motion and Intro while this phase ran; this phase neither made nor reverted those edits. No landing source, Auth guard, museum route path, admin save architecture, integrity implementation or migration was edited by Phase 02.

## Database changes

None. No new tables, migrations, indexes, grants or function changes. Existing nullable associations, categories, sections, items, specifications and gallery tables supply the required content.

## Supabase changes

Local: only the existing read adapter gains the catalog operation and canonical section UUID mapping. No credentials or client security configuration changed.

Deployed: no resource or record changes. Safe anonymous HEAD probes of `museum_items`, `categories` and `museum_sections`, requesting zero records, each returned HTTP 401. This does not verify the schema, deployed RLS, key validity or authenticated access. No authenticated management/database connection was available. Production policy/schema/Storage verification remains incomplete and must happen through authorized read-only access before release.

Browser tests intercept all Supabase-host traffic. They exercise the actual SDK query construction and existing service/domain mapping against controlled responses, not production records or policies. Native tests use injected loaders and actual Three.js geometry calculations. No live writes, Storage deletion or automatic migrations were performed.

## Architecture decisions

Use the existing service facade and Zustand rather than a competing database service or caching library. MuseumLayout owns one catalog load; the Canvas and page subscribe instead of fetching. Admin's `useMuseumItems` remains unchanged. Session cache is keyed to one user, invalidates on owner change/retry, and refresh is explicit. Selection is derived from current progress and ordered database-backed stops, never a hardcoded slug or a request's captured item.

`catalog().sections[].id` and `sections().id` are database UUIDs; `slug` is now a separate optional field. There were no runtime consumers of the old section service beyond its definition. `MuseumItem.museumSection` remains the existing slug-based domain field for admin compatibility, while museum runtime associations use `sectionId`.

Model status is guarded by the currently selected ID/URL. A keyed model boundary ensures old failures do not contaminate a new selection. Cached resources stay shared; clones own transforms and skeletons. Failed-model retry is distinct from data reload. There is no automatic download of every GLB or cache-wide resource disposal.

## Security considerations

`/museum` remains authenticated. Existing RLS/grants and publishable-key client remain authoritative. Explicit published/active filters and defensive local filtering are presentation safeguards, not replacements for RLS. Admin visits to the museum do not request drafts. Non-null invisible/inactive taxonomy associations are conservatively excluded rather than relabeled as active sections.

Public Storage behavior remains unchanged: draft assets can still be public by URL. HTTP(S) model URLs are accepted; other protocols/invalid strings fall back. No service-role keys, new backend, privileged resource changes or weaker policies were introduced. Mock tests cannot prove deployed access control.

## Error and fallback strategy

A failed database fetch clears selected exhibit data and shows an error/reload state. It is never displayed as an empty successful catalog or silently replaced by prototype content. An empty active section shows its actual description and a no-exhibits message. A model failure retains the genuine selected metadata and displays a labeled procedural fallback. Changing selection or retrying resets the model boundary; late statuses from previous models are discarded. Gallery/curator overlay state is scoped to selected UUID.

## Test results

- `npm run test:backend`: 29 passed (Phase 01 guarantees).
- `npm run test:museum`: 11 passed (visibility/order, selection, deduplication, owner/request races, error/retry, reset, tiny/huge geometry and invalid bounds/URLs).
- Phase 01 admin browser suite: 5 passed.
- Museum browser suite: 11 passed (1.6 minutes), including actual mocked SDK reads, selected model/metadata, fitting-compatible tiny/large GLBs, fallback/retry, stale model loads, taxonomy, mobile/Persian, error states and entry after landing scroll.
- Landing regression suite: all 20 passed against the production build (2.5 minutes). Earlier development-server runs had document/context replacement failures; an isolated check passed, and the complete build-preview run passed without changing landing source or tests. Concurrent unrelated source edits were preserved.
- Final TypeScript and production build passed, including the entry-reset/skeleton-cleanup refinement.
- Phase source/test ESLint passed; full-project ESLint retains only the two existing Intro errors at lines 298 and 619. Protected source was not modified to remove them.
- `git diff --check`: passed. Existing bundle/dynamic-import and Three.js compatibility warnings remain. Injected malformed/404 model tests intentionally generate caught loader diagnostics while the museum remains usable.

Commands: `npm run test:backend`, `npm run test:museum`, and with `PLAYWRIGHT_CHANNEL=msedge`, `npx playwright test --config tests/museum.playwright.config.ts`, `npx playwright test --config tests/backend-admin.playwright.config.ts`. The museum/admin suites own local ports 5193/5192 by default. Final landing verification used `PLAYWRIGHT_PORT=5194` with `tests/landing.playwright.config.ts` against an owned `npm run preview -- --host 127.0.0.1 --port 5194 --strictPort` server after a successful build. No test configuration changes were needed; it reuses the preview server.

## Performance considerations

One catalog fetch replaces two independent museum item loads. A nonempty catalog uses five table requests before any SDK retries; an empty item set skips both child-table requests. Selection and language changes do not fetch the catalog. Auth backgrounds no longer request content. Only the selected GLB loads; a previously selected request may finish and cache its asset without changing the current selection. Canvas and successful URL cache entries persist across navigation between exhibits. Direct stop navigation avoids loading intermediate models. No dependencies or post-processing were added.

The existing main bundle is approximately 1.93 MB uncompressed; large-chunk warnings remain. Large collections require future pagination/query limits, and many visited models can accumulate loader cache/GPU resources. Real-world mobile GPU and complex/skinned-model profiling remains necessary.

## Future dependencies

Future rooms should consume section UUIDs, bilingual metadata and selected exhibit UUID from this store rather than embed category/slug constants. Future interactions must use the same selected item as the Canvas/details. Admin changes become visible after explicit catalog reload or a new browser session; any later invalidation/realtime design must preserve request generation guards and Phase 01 save contracts. Real AI, exploded views, model animations, private draft assets and privileged administration need separate scoped work.

## Known limitations

- Production schema/RLS/Auth/Storage access remains unverified; HEAD 401 responses do not certify policy correctness. No production acceptance claim is made.
- Metadata reads are multiple requests, not a single repeatable-read transaction. Collections/specs/gallery remain subject to configured Supabase row limits; no pagination was introduced in this phase.
- Missing/nonvisible non-null taxonomy references are excluded; null associations receive localized UI labels only. Empty sections remain navigable and do not represent newly built rooms.
- Session cache has explicit reload, no realtime subscription or automatic TTL. Old in-flight GLB requests are not aborted; completed assets remain cached. No global memory-budget/LOD system is provided.
- Framing handles finite static bounds, not animated pose envelopes, pathological custom shaders or oversized texture budgets. Model fitting does not add playback/exploded-view functionality.
- The AI curator remains explicitly mocked, and the legacy prototype adapter remains unused by production. No failed content fetch falls back to those records.
- Physical phones, Safari and deployed security integration have not been tested. Existing Intro lint errors and unrelated concurrent landing edits are outside this phase.

## How future phases should use this information

Read this record together with the overview and immutable Phase 01 history. Use `museumItemsService.catalog()`, stable IDs and one shared selection; keep layout scroll ownership separate from Canvas positioning. Preserve the catalog's published/active rules, cache/request guards and scoped model retries. Do not bypass the existing integrity save pipeline, clear shared GLTF resources indiscriminately or restore hardcoded GPU/section mappings. Verify live deployment state separately before any migration/resource changes. Phase 03 has not started.
