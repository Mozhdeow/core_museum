# CORE — Phase 08 Progress

## 08A — Museum foundation, identity reuse and persistent visitor experience

Completed locally: **2026-10-20**. Phase 08B and Phase 08C have not started. This extends the existing connected museum; no Entrance redesign, physical hall, backend, dependency, migration, account, content or security-setting change was made.

### Shared CORE identity

The original procedural `CoreEngine`, including its plates, bolts, circuit textures, materials and motion, was extracted from `HeroMonitorCanvas.tsx` into `src/experience/CoreIdentity.tsx`. Landing still owns exactly its previous Canvas, camera, environment, lighting, shadows, post-processing, scroll integration and transitions. The museum uses the shared scene inside its existing Canvas, with an independent outer scale/rotation/position and disabled pointer parallax. No composer, environment capture or shadow pass was added to the museum.

The identity is explicitly labeled as a decorative placeholder, never an exhibit, UUID, gallery entry or inferred CPU model. Existing uploaded-model loading, fitting, scoped retries and cache behavior remain intact. Procedural textures are instance-owned; generation-guarded deferred cleanup survives StrictMode effect replay and disposes the final instance. Landing and museum cleanup do not share resources. Reduced motion, atmosphere pause, inspection, overlays and document visibility suppress inappropriate identity motion.

Actual browser measurements across all combinations of the museum identity's idle yaw, pitch and bob extrema, including its orbital geometry and label: maximum dimensions **2.2001 × 1.8093 × 2.3032 m**, minimum bottom **1.295 m**, one Canvas. This leaves at least 0.38 m over the highest 0.915 m pedestal plate. The original lower label placement failed the clearance assertion; it was raised before final verification.

### State ownership and restoration

- The catalog store still owns published content, request generations and selection UUIDs.
- The navigation store still owns navigation intents, modes and interaction ownership.
- `MuseumNavigation` remains the only camera writer. It captures walking poses, consumes staged restoration requests and initializes the camera, guided driver, exploration orientation and optional Inspect return/orbit together.
- `useMuseumVisit` waits for the authenticated owner and that owner's fresh, published/active catalog before staging restoration. `visitRuntime` coordinates readiness and throttled persistence; it never writes a camera.
- The connected Canvas is keyed and explicitly bound to its authenticated owner. Both live sampling and teardown flushes reject a different owner, preventing a late old Canvas cleanup from writing its camera into a new account's visit.
- Architectural arrival state is initialized from the restored location. The former controls-owned mount/unmount resets were removed. StrictMode re-entry does not overwrite the snapshot with temporary defaults.

The existing route points were moved without alteration into `museumRoute.ts`, shared by camera ownership and checkpoint validation. This is route geometry, not another controller. Saved guided poses substantially separated from their saved route progress recover the checkpoint. Invalid-pose fallback position and orientation come from the actual guided curve.

### Persistence schema and lifecycle

Storage key: `core-museum-visit:{authenticated-owner-id}` in **localStorage**. Version: **1**. Architecture revision: **connected-08a-1**. Default expiry: **seven days**, centralized in `VISIT_TTL`; the validation/read functions also accept an expiry override.

The allowlisted snapshot contains:

| Field | Meaning |
| --- | --- |
| version, architecture, owner, savedAt | Compatibility, account scope and expiry |
| location, checkpoint | Derived architectural location and last settled guided checkpoint |
| mode, progress, target | Base guided/explore mode, guided progress and intended route destination |
| pose | Safe walking position and normalized quaternion; Inspect uses its walking return pose |
| selectedId, sectionId | Published exhibit UUID or explicit null; catalog section UUID for an empty section |
| inspect | Optional settled model/schematic subject, source UUID/model-path identity and bounded orbit |

No tokens, passwords, profiles, catalog records, GLTF resources, model-ready flags, timelines, input state, dialogs, focus state, pending requests or viewport dimensions are persisted.

Validation treats storage as untrusted and constructs a fresh DTO rather than merging arbitrary stored fields into Zustand. It checks version/revision/owner/timestamps, enums, UUIDs, finite vectors/quaternions, walking height, quaternion normalization, roll/pitch, current collision/pedestal constraints and guided-route compatibility. An invalid pose recovers a valid checkpoint; invalid/incompatible/expired envelopes start at Entrance. Storage getter, parsing, quota and write failures leave navigation usable.

Camera samples do not cause React updates. Changed snapshots write no more than approximately once per second, with pagehide, visibility and route-cleanup flushes. Sampling requires the matching owner, completed bootstrap and a ready current catalog. Existing navigation reporting remains separate from pose storage.

| Event | Behavior |
| --- | --- |
| Refresh or browser reopen | Restore the same account's valid localStorage visit |
| Return from another application route | Resume the saved visit |
| Explicit museum Exit | Preserve the visit |
| Restart visit | Remove the active snapshot, clear selection/education and return to Entrance; subsequent activity may save the new Entrance visit |
| Explicit sign-out / SIGNED_OUT | Remove the active account's snapshot and reset museum runtime state before Auth completes |
| Account switch | Start/reconcile only the new owner; old asynchronous catalog and camera work cannot populate it |
| Temporary Auth loading | Preserve persisted data; restore after trusted Auth/catalog readiness |
| Catalog error | Keep the error/retry UI and deliberate navigation usable; do not apply stale content or overwrite a pending visit with loading defaults |
| Deliberate navigation during pending restoration | Cancel the old restoration intent |

Guided tours restore paused, including partial progress/intended destination and completed-tour state. Continue resumes through the existing GSAP owner. No introduction is replayed and no URL hash/query/route parameter is used; the address remains `/museum`.

Only a settled active Inspect descriptor is recoverable. Source, safe return pose and orbit must still validate; real-model restoration also waits for the current compatible GLB to load and match its model path. Failed/changed/unavailable subjects and incomplete transitions return to walking. The education store reopens in a defined idle state; live lesson timelines are never recreated from storage. Projection offsets and FOV are recomputed for the current viewport/RTL direction.

### Exhibit, media and action consistency

Catalog reload preserves selected UUID and derives its new stop index after loading. It also preserves explicit null and valid empty-section selection. Removed, unpublished or inactive-taxonomy selections clear with localized unavailable feedback rather than silently choosing another exhibit. An explicit selection made during an in-flight reload still supersedes the older selection intent.

`museumPresentation` resolves a selected item's category/section UUIDs against the current active catalog taxonomy. Canonical CPU taxonomy identifies the currently implemented hall; conflicting/missing non-null associations fail closed. Editable slug copies on an exhibit are not authoritative. Without adding schema, canonical taxonomy slugs still establish which active taxonomy represents CPU: renaming those canonical taxonomy slugs intentionally makes the association unavailable until a future reviewed mapping exists.

Scene, metadata and controls use the same presentation decision. CPU-compatible selections may navigate to CPU Hall. Storage/GPU/Memory/Motherboard/future selections do not trigger a claim of arrival at an unbuilt hall and retain metadata-only access wherever the visitor is standing. The physical placeholder remains independent of the selected archive record.

Actions explicitly distinguish **Inspect selected model** from **Explore CPU schematic**. Both retain the existing bounded camera controls, safe exit, lessons, reversible layers and hotspots. No generalized hardware inspector or arbitrary GLB layer inference was added.

Gallery's ordered database `item_id` mapping, captions, feature flags, empty/broken-image states, portal, focus trap, Escape behavior and input ownership were preserved. No thumbnail substitution or real media edit was made. Curator requests now supply current exhibit metadata to a pure local demo reader. It returns only the matching published record's localized information/specifications and an explicit limitation; comparisons, absent context and mismatched IDs do not produce invented facts. The visible mock disclosure remains. There is no AI API or credential.

UI changes are focused: explicit archive labeling separate from architectural wayfinding, metadata access outside CPU Hall, distinguishable Inspect actions, unobtrusive Restart visit, Continue tour copy, fewer duplicate location descriptions and localized unavailable-selection feedback. Existing responsive disclosures, touch controls, keyboard ownership and Persian RTL remain.

### Exact Phase 08A file inventory

New files:

- `src/experience/CoreIdentity.tsx`
- `src/features/museum/visitPersistence.ts`
- `src/features/museum/visitRuntime.ts`
- `src/features/museum/useMuseumVisit.ts`
- `src/features/museum/museumRoute.ts`
- `src/features/museum/curatorDemo.ts`
- `tests/museum-visit.test.ts`
- `tests/museum-visit.spec.ts`
- `tests/museum-visit-fixture.ts`
- `tests/museum-visit.playwright.config.ts`
- `docs/phase08/PHASE_08_PROGRESS.md`

Existing files changed by this phase (including existing uncommitted Phase 07 files):

- `src/experience/CPUHall.tsx`
- `src/experience/CorePreview.tsx`
- `src/experience/MuseumCanvas.tsx`
- `src/experience/MuseumNavigation.tsx`
- `src/experience/MuseumScene.tsx`
- `src/features/auth/authStore.ts`
- `src/features/landing/components/HeroMonitorCanvas.tsx`
- `src/features/museum/AICuratorPanel.tsx`
- `src/features/museum/CPUExperienceControls.tsx`
- `src/features/museum/MuseumNavigationControls.tsx`
- `src/features/museum/cpuExperience.css`
- `src/features/museum/exhibitPresentation.ts`
- `src/features/museum/museumNavigation.css`
- `src/features/museum/museumState.ts`
- `src/features/museum/navigationState.ts`
- `src/i18n/locales/en/museum.json`
- `src/i18n/locales/fa/museum.json`
- `src/layouts/MuseumLayout.tsx`
- `src/lib/services/mockServices.ts`
- `src/pages/Museum/MuseumPage.tsx`
- `src/types/services.ts`
- `tests/museum-cpu.spec.ts`
- `tests/museum-final-qa.spec.ts`

Existing browser assertions were updated for the intentionally distinct action labels and shared identity's bounded dimensions, retaining their interaction/cache/clearance checks. No dependency or package-script change was needed.

An initial SHA256 inventory was captured under ignored `.tmp/phase08`. Two unrelated files, `MuseumArchitecture.tsx` and `MuseumPrimitives.tsx`, were reformatted during the session outside this phase's edits; those incoming/concurrent changes were preserved and are not included in the implementation inventory. Other pre-existing unrelated changes, all backend phase records, Phase 07 documentation, Supabase migrations and security configuration were preserved.

The final preservation check compared 22 selected historical/backend/migration and unrelated source files against that initial inventory; all matched. No environment or security configuration was edited.

### Verification and actual outcomes

**102 distinct automated cases passed**, counting reruns only once:

| Group | Result |
| --- | --- |
| Museum native state/geometry/CPU/navigation/visit | 33 passed: 24 existing + 9 new |
| Existing Auth/role native contracts | 10 passed |
| Existing museum navigation/CPU/final-QA browser scenarios | 26 passed |
| New visit browser scenarios | 13 passed |
| Existing Landing production-preview suite | All 20 passed |
| TypeScript typecheck | Passed |
| Focused ESLint on changed TypeScript/tests | Passed with zero errors/warnings |
| Production build | Passed |
| `git diff --check` and new-file whitespace | Passed |

The visit browser fixture uses a controlled SDK session and intercepted profile/catalog/media responses, including actual document reloads. Tests cover Entrance/Passage/CPU, Free Explore position/orientation, page close/reopen, route return, partial/paused/completed guided state, restart/sign-out, full-reload and same-document account switching, corrupted/expired/wrong-account/unsafe state, unavailable exhibits, empty content, delayed content versus deliberate navigation, temporary Auth initialization, denied storage, stable model/schematic Inspect and failed-model recovery. Native tests additionally verify selection reorder, explicit null/empty sections, stale requests through preserved tests, metadata-only policy, curator scope and one-write-per-second throttling. Resource tests observe both shared identity textures disposing after route exit and navigation listeners no longer consuming destination keys.

Initial browser iterations exposed stale timestamped Vite module copies in test probes, a probe that read R3F roots before mount, the low identity label, and a pre-pagehide orientation expectation while damping still settled. Servers were restarted, probes wait for camera initialization, the label was raised, and the orientation assertion reads the snapshot actually present at document startup. A cold camera-start wait passed unchanged in isolation. Catalog-error coverage also caught missing initial camera diagnostics while persistence awaited content; initial diagnostics now describe the initialized camera independently of catalog restoration. Affected cases were rerun and passed; assertions were not weakened into content or security bypasses. Focused lint findings were fixed. These iterations are not additional distinct passing cases.

Reproduction:

```powershell
node --test tests/museum-visit.test.ts tests/museum-navigation.test.ts tests/museum-cpu.test.ts tests/museum-final-qa.test.ts tests/museum-integration.test.ts tests/auth-roles.test.ts
npx playwright test --config tests/museum-visit.playwright.config.ts
npx playwright test --config tests/museum-navigation.playwright.config.ts
npm run typecheck
npm run build
```

Landing checks used the frozen production build and a local preview at port 5199, `PLAYWRIGHT_PORT=5199`, `PLAYWRIGHT_CHANNEL=msedge`, and `tests/landing.playwright.config.ts`. No full unrelated CMS/SQL/security regression matrix was run. Existing large-chunk/ineffective service-import and Three Clock/shadow warnings remain. Historical protected Intro lint errors were not changed or suppressed; focused phase lint is clean.

### Visual QA

Rendered captures were inspected for Entrance with distant CORE, restored Passage, CPU CORE fallback, desktop schematic and archive selection, mobile portrait and short-landscape Persian inspection/overlays. Identity geometry/label clearance, framing and control separation were reviewed. Evidence is ignored under `.tmp/phase08/`:

- `restored-entrance.png`, `restored-corridor.png`, `restored-cpu.png`
- `core-desktop.png`, `schematic-desktop.png`, `metadata-desktop.png`
- `mobile-core-fa.png`, `mobile-schematic-fa.png`, `landscape-schematic-fa.png`
- `identity-motion-bounds.json`
- `landing-before.png`, `landing-after.png`, `landing-comparison.json`

The 1440×900 English reduced-motion Landing before/after comparison has **zero changed pixels out of 1,296,000**, maximum channel delta zero. This establishes equivalence for that captured composition, not pixel identity for every animated frame. The 20 existing Landing checks separately passed transitions, Intro, responsive/RTL layout, entry, reverse motion, reduced motion and Canvas preservation.

### Limits and Phase 08B handoff

All browser content/authentication is controlled fixture evidence; it does not certify current live Supabase records, real asset semantics, RLS deployment, physical keyboards or real-device GPU performance. No existing accounts, records or Storage objects were modified for acceptance. The earlier white-floor recording remains unreproduced; no claim about that historical clip is added here.

Persistence is browser-local, account-scoped and retained only while localStorage is available. Closing/reopening was verified both by closing/reopening a page and by shutting down an actual isolated Edge process and launching another with the same test-only persistent profile; mode and camera position survived. An operating-system crash and physical-device process restart were not separately tested. Browsers may evict or block localStorage. Concurrent same-account tabs use last-writer-wins storage, without live cross-tab camera synchronization. Tour/lesson playback is intentionally not resumed automatically. Taxonomy renames and future architecture revisions must keep the fail-closed association and snapshot-version contracts.

The museum foundation is ready for a separately authorized **Phase 08B Entrance design** task. Preserve the camera/visit/published-content/resource contracts. The generalized multi-hardware Inspector remains Phase 08C. Neither phase was started by this work.

## Phase 08 — Functional corrections (2026-10-20)

The subsequent functional-corrections request supersedes the earlier metadata-only restriction for non-CPU exhibits. This work extends the completed foundation; Entrance design and a generalized hardware Inspector were not started.

### Investigation: code defect versus actual content

The general rendering defect was confirmed in `MuseumLayout`, `museumPresentation` and `MuseumCanvas`: only CPU-compatible selections supplied an exhibit UUID/URL to the model renderer. Every other published item was deliberately metadata-only, so a valid uploaded motherboard could never reach GLTF loading. Active taxonomy was already fetched by the Supabase catalog, but visitor controls exposed neither category filters nor an explicit section browser.

The existing backend contract remains: query published items and active categories/sections, hydrate associations by UUID, build the public `museum-models` URL from `model_path`, validate HTTP(S), load GLTF, and fit finite measured geometry. Catalog reload refreshes those records; model retry clears the selected GLTF cache entry and remounts its error boundary. Conflicting or unrelated taxonomy never qualifies a model for CPU Hall.

The screenshot identifies **Computer Motherboard**, UUID `e2c64a2f-0335-4429-8cd6-3bcbb4c93cb7`, with `motherboard.glb`, **3.16 MiB**. That upload metadata does not establish publication, active associations or an accessible asset URL. A read-only anonymous request using the existing public configuration reached Supabase, but all three catalog tables returned **401 / permission denied**. No connected authenticated browser session was available. Consequently this specific row's publication, category/section UUIDs, model path, HTTP response and actual GLB geometry remain **unverified**. This is an access/evidence limit, not evidence that its file is corrupt or a request to change grants. No database records, Storage objects, permissions or credentials were changed. Read-only evidence: ignored `.tmp/phase08-corrections/content-audit.json`.

### Implemented behavior

- Shared CORE now supports model-scoped desktop hover in the museum: damped yaw up to ±0.65 rad and pitch up to ±0.22 rad, returning to the existing idle pose. Fine-pointer/reduced-motion gating, paused atmosphere, overlay/Inspect ownership and resource cleanup remain. Landing retains its Canvas-based parallax and original composition. No second Canvas was added.
- `UploadedExhibit` shares the existing cached GLTF cloning, finite fitting, loading/error boundary and local-skeleton cleanup between CPU Hall and corridor displays. Corridor failures/missing uploads show localized placards for the actual record, with accessible metadata/media and retry; they do not substitute a CPU or another published item. Selected cached neighbors re-report readiness/errors when selected, avoiding stale loading state.
- Four existing corridor recesses now show selectable, correctly labeled published records. A section's selected UUID determines a batch of at most four; category filtering also applies physically. Only the nearest pair mounts GLTF loaders, with no all-catalog preload. Existing CPU exhibits stay on their hall pedestal. Generic display bounds are 1.65 × 1.5 × 0.42 m, measured bottom 1.15 m. Supports and models stay beyond walking x=±2.45 and inside frame posts: support extent 2.57–3.13 m, model extent at most 2.64–3.06 m. The second pair clears existing wall reliefs. No new bespoke halls or collision controller were generated.
- Visitor controls expose all active database categories and sections in catalog order, with English/Persian labels, category/section filtering, empty results and reload. Arbitrary new slugs appear after reload. Sections without a built exhibition use the same accessible passage showcases; the selected record, physical case, metadata, gallery and section label share its UUID. Empty sections retain explicit null selection after reload rather than choosing another item. Touch movement remains at the front of the expanded mobile panel so additional taxonomy controls cannot push it out of reach.
- Space toggles an incomplete Guided Tour's Pause/Resume and prevents default scrolling only when handled. Repeats, modifiers, forms/contenteditable, dialogs, Inspect, Free Explore and other interactive controls keep keyboard ownership. Existing destination and Inspect shortcuts remain.
- The existing camera owner alone applies deliberate showcase navigation. Its pose persists as a normal safe Free Explore pose. Snapshot version/architecture, account isolation, return poses, selected UUID/section, restart/sign-out and restoration gates remain intact. Category filters are browsing state, not a new snapshot schema.

### Verification results

| Check | Result |
| --- | --- |
| Native museum/state/geometry/persistence and Auth contracts | **46 passed** (36 museum + 10 Auth) |
| New functional-correction browser cases | **8 passed** |
| Existing navigation/CPU/overlay browser cases | **26 distinct cases passed** |
| Existing persistence/reload/browser-process cases | **13 passed** |
| Focused production Landing cases | **6 passed**: desktop/mobile EN/FA, reduced motion, rigid monitor/Canvas |
| Typecheck, production build, changed-file ESLint, diff whitespace | **Passed**, zero focused lint warnings |

These are 53 distinct browser cases; corrective reruns are not additional cases. The first regression run identified an obsolete fixed MEMORY sign expectation and touch movement pushed below the scroll area. The test now targets the real exhibition sign; movement controls were made reachable and actual touch holding passed. A cold WebGL initialization exceeded the fixture's original five-second mount wait; the fixture now allows fifteen seconds for camera initialization. A gallery Space probe initially activated its focused Close button; the corrected ownership check targets the dialog itself and preserves normal button activation. Missing/404 GLB fixtures, selected cached models, retry, arbitrary new taxonomy, empty categories/sections, catalog refresh, real page reload, UUID/gallery agreement and selected generic camera restoration were verified. Existing CPU lessons, orbit/return, collision, mobile overlays, sign visibility, texture/listener cleanup and account isolation passed. The final display-envelope adjustment was checked again in the correction suite and checkpoint sign test.

Visual inspection covered CORE in CPU Hall, generic loaded/unavailable displays, empty Persian sections, desktop, 390×844 and 844×390 RTL views, plus the production Landing composition. Ignored evidence is in `.tmp/phase08-corrections/`: `core-hover.png`, `board-desktop.png`, `unavailable.png`, `taxonomy-empty-rtl.png`, `board-mobile-rtl.png`, `board-landscape-rtl.png`, `core-motion-envelope.json`, and `landing-reduced-motion.png`. Full hover-envelope corner measurements keep the CORE/label bottom at **1.295 m**, with maximum measured size below **2.21 × 1.91 × 2.29 m**. Browser GLBs are deliberately minimal valid fixtures; the triangle visible in their captures is fixture geometry, not the user's downloaded motherboard. Fixtures intercept requests and never create live published records.

Reproduction:

```powershell
node --test tests/museum-corrections.test.ts tests/museum-visit.test.ts tests/museum-navigation.test.ts tests/museum-cpu.test.ts tests/museum-final-qa.test.ts tests/museum-integration.test.ts tests/auth-roles.test.ts
npx playwright test --config tests/museum-corrections.playwright.config.ts
npx playwright test --config tests/museum-navigation.playwright.config.ts
npx playwright test --config tests/museum-visit.playwright.config.ts
npm run typecheck
npm run build
```

The six Landing cases used a frozen production preview on port 5199, Edge, and `tests/landing.playwright.config.ts`. Existing bundle-size/service-import and Three deprecation warnings remain nonblocking. Emulated touch and fixture tests do not certify physical-device GPU performance, the real motherboard asset or live authenticated catalog access.

### Files and scope

- Added: `src/experience/UploadedExhibit.tsx`, `CorridorExhibitions.tsx`; `src/features/museum/exhibition.ts`, `MuseumCollection.tsx`, `showPublishedExhibit.ts`; `tests/museum-corrections.test.ts`, `.spec.ts`, `.playwright.config.ts`.
- Updated shared identity/scene: `CoreIdentity.tsx`, `CorePreview.tsx`, `MuseumScene.tsx`, `MuseumCanvas.tsx`, `MuseumArchitecture.tsx`, `MuseumPrimitives.tsx`, `MuseumNavigation.tsx`.
- Updated visitor state/UI: `museumState.ts`, `navigationState.ts`, `useMuseumVisit.ts`, `exhibitPresentation.ts`, `MuseumNavigationControls.tsx`, `museumNavigation.css`; `MuseumLayout.tsx`, `MuseumPage.tsx`; EN/FA `museum.json`.
- Updated focused fixtures/expectations: `museum-visit-fixture.ts`, `museum-visit.spec.ts`, `museum-final-qa.spec.ts`; appended this progress record.

Start-of-request hashes preserve pre-existing unrelated edits and confirm no changes to Landing feature files, Auth, CMS, backend services or migrations; dependency manifests also remain unchanged. The shared identity preserves Landing composition and the existing security contracts. The real motherboard content investigation still requires an authenticated read of its record and asset. **Stop before Phase 08B.**

## Phase 08 — Final stabilization and category exhibitions (2026-10-20)

This entry supersedes the four-item physical paging, Section visitor directory and decorative CPU fallback descriptions above. Work continued in the existing dirty tree; completed Phase 08A and the in-progress admin fixes were retained. Phase 08B was not started.

### Final behavior and confirmed causes

- Every active Category owns one physical showcase, keyed by its category UUID. CPU uses its existing pedestal; other categories use the passage recesses first. Additional categories extend a plain, repeatable archive aisle behind the vestibule rather than replacing another category or generating bespoke halls. The extension shares the existing floor/frame/material vocabulary. Its walking boundary grows with the catalog, and display envelopes remain outside x=±2.45 m. Positions depend on ordered active categories, never item count, archive selection or category filtering. Taxonomy reordering can intentionally relocate cases; obsolete/out-of-bounds saved poses still use the existing safe checkpoint fallback.
- Each case retains its category's current published UUID and cycles Previous/Next with wraparound and 1/N. Accessible visitor controls cycle the selected category; physical controls select the same records. UUID, title, model URL, metadata, gallery and Inspect use that selection. Other category cases retain their choices during ordinary browsing and catalog reload. Reload persistence restores the globally selected UUID/filter and camera, not a durable history of every inactive carousel.
- The renderer mounts only the nearest pair of generic cases, the CPU category's current model, and the selected model validation/Inspect instance. It never preloads every item in a carousel. Multiple instances share the GLTF cache; each owns its cloned nodes/materials. Distant nonempty cases say to approach the showcase; loading/error/missing states do not become an empty category. There is one empty placard per genuinely empty category. Redundant filtered-empty archive signage was removed.
- Category changes and carousel changes do not move the camera. Explicit Go to exhibit uses MuseumNavigation's owned, collision-constrained flight and rotates toward the category case. Space pauses/resumes it. A focused browser check found that GSAP completion previously handed control back while the damped camera was still short of the target: completion now waits for the actual position and orientation to settle. Reduced motion keeps its established direct arrival behavior. CPU approach, skip, Inspect return poses and the single Canvas remain.
- A reproducible code defect explains edge-on presentation for tall flat assets: setting Euler Z after rotating X/Y applies an unintended local-axis composition. The normalizer now premultiplies the landscape adjustment around world Z. All three flat source axes were checked with tall hardware geometry. Visible finite triangles, material visibility and alpha are checked before readiness; cloned DoubleSide materials permit underside inspection. Fitting keeps measured geometry inside each display envelope. This is stronger than network/load success, but cannot certify the semantics or appearance of an unseen real asset.
- `exhibitModelPresentation.ts` provides optional UUID-specific rotation (radians), auto-orientation opt-out and bounded scale calibration. It is deliberately empty until an actual asset is inspected. Calibration is applied before safe fitting and does not change GLBs, database rows or schemas. A valid category CPU is presented on its pedestal; missing/unrenderable CPU uploads use the existing assembled educational schematic. CPU captions were moved off the clipped upper edge to the pedestal front; generic labels remain width-fitted.
- Inspect readiness is UUID+URL scoped, cached only in memory, invalidated by URL changes/retry, and validated for the selected model independently of camera distance. Selecting an already selected/cached UUID no longer resets it to loading with no subsequent notification. Full horizontal orbit, top/underside, wheel zoom, reset, touch pinch and exact walking-camera return remain under MuseumNavigation. Arbitrary GLBs receive intact-model inspection; CPU educational lessons/explosion remain separate.
- Visitor browsing is Category-first. Museum Sections remain bilingual curatorial metadata in CMS/backend and item information, including the existing active/published eligibility contract. Section metadata cannot classify a non-CPU category as CPU. No taxonomy consolidation or backend migration was performed.

### Admin work retained and completed from the interrupted stabilization pass

The existing draft implementation was inspected and retained: mounted forms survive same-account Auth revalidation and normal rerenders; public CMS field drafts are account/resource scoped with expiry and explicit Restore/Discard after reload. Item and taxonomy saves retain original versions and reject stale updates. Queued Files remain only in memory across ordinary route remounts; reload requires reselection. Confirmed save/sign-out clears drafts. Credentials, user-management operations and file contents are excluded from durable drafts. Section English/Persian descriptions are preserved on edits. Successful CMS writes invalidate the visitor catalog, including when the museum remounts later. No SQL/RLS/RBAC/Storage contract was modified.

The final focused admin check was strengthened to actually queue a valid GLB before Auth/tab/route changes and verify that the queue survives remount. The second check verified explicit recovery after reload and rejection against a newer server version. Earlier broad admin checks from the interrupted pass are historical evidence and were not rerun for this request.

### Strictly limited verification

**11 distinct representative scenarios passed**, serial browser workers, with no full regression suite:

| Scope | Scenarios | Result |
| --- | --- | --- |
| Native | Tall flat geometry in three source orientations plus bounded calibration; 12 category placements/clearance; same/cached UUID readiness and changed URL | 3 passed |
| Museum browser | Persistent category case + multi-item carousel/lazy neighbors; cinematic approach/Space pause/resume; CPU front surface and missing-upload assembled fallback; cached Inspect/full orbit/top/underside/reset/zoom/exact return/reload; newly refreshed seventh category/empty results/extended-aisle restoration; mobile Persian reduced-motion touch pinch | 6 passed |
| Admin browser | Auth/tab/route field and queued-upload preservation; reload recovery retaining original conflict version | 2 passed |
| Typecheck / focused changed-file ESLint | Final checks | Passed, zero focused lint warnings |
| Production build | One final build with RAYON_NUM_THREADS=2 | Passed |

The initial museum run had four passes and two failures. One exposed the premature camera handoff fixed above. The other was a strict locator matching several copies of empty-state text; it now asserts the specific catalog status element without weakening the expected state. Only failed cases and cases affected by subsequent visual/assertion changes were replayed. Counts above represent distinct scenarios, not executions. Old fixture assertions about fixed slots/Section visitor browsing were updated to the final category policy; the older suites were not rerun.

Commands:

```powershell
node --test tests/phase08-category.test.ts
node node_modules/@playwright/test/cli.js test --config tests/phase08-category.playwright.config.ts
node node_modules/@playwright/test/cli.js test --config tests/phase08-admin.playwright.config.ts --grep 'ordinary profile revalidation|document reload offers'
npm run typecheck
# ESLint used only the changed TS/TSX files captured for this request.
$env:RAYON_NUM_THREADS='2'
npm run build
```

CPU front, the deliberately approached 2/2 category showcase and mobile RTL Inspect captures were visually inspected. Evidence: ignored `.tmp/phase08-category/cpu-front.png`, `multi-item-category.png`, `mobile-rtl.png`, baseline/changed-file/integrity JSON. The captures use a real parsed GLB fixture with tall, thin hardware proportions, not the user's downloaded processor/motherboard. Existing bundle-size/service-import and Three deprecation/shadow warnings remain nonblocking. No recurring test-runner failure occurred with one browser worker and two Rayon threads. PostgreSQL/security suites were intentionally not executed in this limited pass.

### Files, asset limit and handoff

Primary exhibition changes: `exhibition.ts`, `museumState.ts`, `MuseumCollection.tsx`, `showPublishedExhibit.ts`, `CorridorExhibitions.tsx`, new `CPUCategoryExhibition.tsx`, `MuseumArchitecture.tsx`, `museumCollision.ts`. Camera/presentation: `MuseumNavigation.tsx`, `navigationState.ts`, `MuseumNavigationControls.tsx`, `visitPersistence.ts`, `exhibitPresentation.ts`, `UploadedExhibit.tsx`, `modelGeometry.ts`, new `exhibitModelPresentation.ts`, `MuseumScene.tsx`, `MuseumPage.tsx`, EN/FA museum strings. Added focused `phase08-category` tests/config and reusable `hardware-fixture.ts`; strengthened the existing admin draft scenario and aligned obsolete fixture expectations. Existing CMS/Auth draft files remain in the working tree.

Landing and public assets are unchanged against the start-of-this-request hashes. Supabase files and dependency manifests remain unchanged against the earlier stabilization baseline. No live data, taxonomy, asset, migration, permission or dependency changes were performed.

**Real-asset acceptance is still pending.** There are no processor/motherboard GLB files in this repository. The earlier read-only anonymous Supabase audit returned 401 for catalog tables and did not establish the real record/model URL. This pass did not acquire an authenticated live asset. Consequently the world-axis defect is confirmed and fixed with reproducible fixtures, but the exact cause/orientation/material behavior of the user's Computer Processor binary and the real motherboard's current publication/associations remain unverified. A semantic front/back calibration may still be required in the UUID presentation map after authorized asset access. Physical-device GPU behavior and very large catalogs were not benchmarked.

The Phase 08 frontend corrections are ready for review on these focused checks. Full real-content sign-off remains conditional on viewing the actual processor and motherboard assets. Phase 08B Entrance design has not begun; stop here.

## Phase 08 — Showcase loading UX polish (2026-10-20)

Continued from the completed category exhibition tree. This change is limited to showcase presentation; category identity, carousel selection, navigation/collision, saved visits, CMS/backend and the single Canvas are preserved.

### Presentation

- Distant nonempty cases now show lightweight cyan schematic outlines instead of “Approach to load model”. Memory, GPU and storage have distinct silhouettes; other/custom categories use a neutral technical-board outline. These are procedural display cues, not substituted published assets. Category/item labels and counts remain in their existing positions.
- The existing nearest-pair loading budget and longitudinal 5 m activation range are unchanged. Only that pair mounts generic real GLBs. During preparation a gentle scan line and opacity pulse animate over the outline, without loading/error-style copy. The near reveal begins inside 2.5 m longitudinal distance when the instance is renderable. Already prepared mid-range models remain visually staged until approach.
- Near models and outlines crossfade over 200 ms using the existing cubic ease-out progression. Each GLTF instance fades its own cloned materials; original opacity, transparency, alpha-test cutouts and depth-writing are restored at full reveal. Shared cached assets/materials are untouched. Leaving near range retargets the fade; UUID/URL/retry keys isolate incoming carousel items from stale presentation status.
- Reduced motion keeps the preparation cue stationary and removes entrance scaling while retaining the brief opacity transition. Pulse/scan activity respects atmosphere pause, overlays, Inspect and document visibility. Preview edges/materials are explicitly disposed; no lights, post-processing, dependency or additional Canvas were added.
- Actual failed/unsupported/missing uploads retain explicit unavailable placards. Empty categories retain their separate, clean empty state and never receive a populated/loading outline. CPU's existing educational fallback remains; its ordinary preparation subtitle no longer displays technical loading copy.

### Focused verification

Four distinct browser scenarios passed with one worker:

1. Far populated outlines are visible with zero generic GLB requests; an empty category has only its empty treatment, and an absent upload has its explicit unavailable treatment.
2. A held GLB response shows an animated scan at a deterministic mid-range pose, loads only the nearest pair, keeps the prepared model hidden at mid range, and crossfades near. Animation-frame samples contain intermediate model opacity values, then reach the authored final opacity while the proxy disappears.
3. A real fixture HTTP 404 removes the preview and shows unavailable copy without mislabeling the category empty.
4. Persian RTL/reduced-motion preparation remains stationary, completes the reveal and retains one Canvas.

The initial run passed three cases; the mid-range test first sampled a camera already inside near range. The fixture now requests a deterministic route midpoint through MuseumNavigation, asserts the actual distance, and preserves the opacity assertions. Only that failed scenario was replayed. Focused ESLint initially flagged direct mutation of a memoized Three material; frame updates now use the mounted Three object refs. Final changed-file lint is clean. No broad regression suites were run.

`npm run typecheck`, changed-file ESLint and one final production build passed. The build uses `RAYON_NUM_THREADS=2`; existing large-bundle/service-import and Three deprecation warnings remain. Test HTTP 404 output is expected failure-fixture evidence, not an unresolved application exception. Visual inspection covered far, mid, near and failed-model captures in ignored `.tmp/phase08-showcase-ux/`. GLBs remain controlled fixtures; no real assets or database records were changed.

Reproduction:

```powershell
node node_modules/@playwright/test/cli.js test --config tests/showcase-loading.playwright.config.ts
npm run typecheck
node node_modules/eslint/bin/eslint.js src/experience/CorridorExhibitions.tsx src/experience/ShowcasePreview.tsx src/experience/UploadedExhibit.tsx src/experience/CPUCategoryExhibition.tsx tests/showcase-loading.spec.ts tests/showcase-loading.playwright.config.ts
$env:RAYON_NUM_THREADS='2'
npm run build
```

Files: new `ShowcasePreview.tsx`, `showcase-loading.spec.ts` and its focused Playwright config; updated `CorridorExhibitions.tsx`, `UploadedExhibit.tsx`, `CPUCategoryExhibition.tsx` and this progress log. Stop after Phase 08 UX polish; Phase 08B was not started.

## Phase 08 — Final showcase visual correction (2026-10-20)

This entry supersedes the rectangular wireframe previews and single distance thresholds in the preceding polish entry. The current working tree was preserved. Changes are confined to preview geometry, optional same-item thumbnail accents and physical-model LOD transitions; no Entrance redesign, camera writer, backend, Landing, taxonomy or asset changes were made.

### Source corrections

- The old previews were only `EdgesGeometry` boxes. They are replaced with solid, low-poly category illustrations: GPU card/shroud with two fan rings, hubs and radial blades; RAM PCB with eight chips and gold contacts; motherboard socket, memory/expansion slots, I/O and capacitors; HDD platter/spindle/actuator; SSD enclosure, label and connectors. Custom categories receive the component-bearing board illustration. These are category previews, not fabricated published GLBs. UUID/title/carousel association remains the selected record's.
- Geometry is merged by material into **4–5 batches per preview**, with **316–728 triangles** per category illustration. Solid resting materials retain depth writing and opacity 1 rather than looking like empty transparent frames. No new lights, post-processing, dependencies or Canvas were added. A direct geometry inspection confirmed finite, bounded preview sizes within 1.65 × 1.5 × 0.42 m before the small display tilt.
- An available thumbnail from the same item can appear as a small image accent. It is requested only while that case's nearest pair is active, resized to a 256 × 192 texture, and disposed on unmount. Missing/blocked thumbnails leave the hardware illustration complete. Full-resolution source images are not retained as GPU textures; the far preview does not depend on image availability.
- Near reveal now has **2.5 m entry / 3.4 m exit hysteresis**. Real-model activation keeps the existing **5 m entry** with **6 m release**, and another row must be **0.9 m closer** to replace the current pair. Measurements retain the existing longitudinal distance strategy.
- The outgoing pair retires for **300 ms of capped frame time** with reveal disabled before it unmounts. That gives the **200 ms** reverse crossfade time to restore the solid preview. The next pair mounts after retirement, maintaining at most two generic physical GLB instances instead of overlapping pairs. Preview and real-model fade steps both cap frame delta, so a delayed frame does not instantly skip the transition. Returning during retirement retargets the current transition. Demand rendering explicitly advances retirement in reduced-motion mode.
- The scan cue runs only during actual GLB preparation; receding from an already prepared model no longer restarts an artificial loading animation. Genuine missing/error placards and truly empty categories retain their separate states. Inspector instances retain the default non-LOD path and UUID/cache behavior.

### CPU investigation and limits

CPU Hall does not use `ShowcasePreview` or the corridor distance LOD. Its real model keeps the uploaded material parameters (on owned clones) and its existing educational fallback. The source inspection found no distance rule that converts that CPU into a wireframe. The intentionally green Box GLB used in earlier screenshots is a fixture and cannot establish the cause of the user's reported hollow-green CPU. The actual processor GLB is still absent from this repository; the earlier live anonymous catalog access limitation remains. No speculative CPU recoloring, opacity override or asset replacement was applied. Actual CPU appearance remains unverified.

### Verification status — browser acceptance is blocked

Added exactly **three focused browser scenarios** in `showcase-final.spec.ts`:

1. Approach/recede opacity samples in both directions, reveal/load deadbands, pair handoff budget, carousel UUID and Inspect availability/exit.
2. GPU/RAM/motherboard/HDD/SSD solid previews, zero distant generic GLB requests, optional same-item image, near/far captures and authored CPU-fixture material flags.
3. Failed model after recession, distinct populated/empty states and unavailable Inspect.

**These scenarios have not passed or produced accepted near/far screenshots in this pass.** The first run stalled during `page.goto('/museum')`, before the museum scene mounted: local Vite module requests remained unfinished until the 65-second navigation timeout. It was interrupted rather than consuming retries. One attempt with a separate Vite dependency cache reproduced the initial-load stall; that run was also interrupted. No assertions were weakened and no further browser retries or full regression suite were run. The committed test configuration retains the normal fixture setup; the alternate-cache diagnostic is ignored under `.tmp/phase08-showcase-final/`.

- `npm run typecheck`: **passed**.
- Changed-file ESLint: **passed**, zero warnings after removing an unnecessary state-in-effect thumbnail latch.
- Direct geometry inspection: all five variants construct successfully, have 4–5 merged batches, and fit the preview envelope. GPU 728, RAM 396, motherboard 512, HDD 360 and SSD 316 triangles. This is geometry evidence, not browser visual acceptance or a physical-device performance measurement.
- Production build: **not run**, as requested for this limited source/visual correction; browser startup remains an explicit verification blocker.
- Actual user recording/CPU asset appearance was not certified. No near/far visual sign-off is claimed from earlier screenshots or unrelated fixtures.

Files: `hardwarePreviewGeometry.ts` (new), `ShowcasePreview.tsx`, `CorridorExhibitions.tsx`, `UploadedExhibit.tsx`; new `showcase-final.spec.ts` and `showcase-final.playwright.config.ts`; this log. To resume focused browser acceptance when the local dev-server load is working:

```powershell
node node_modules/@playwright/test/cli.js test --config tests/showcase-final.playwright.config.ts
```

The requested source corrections are implemented, but final near/far browser acceptance and the real CPU investigation remain outstanding. **Phase 08B has not started; stop here.**

## Phase 08 — Final visual acceptance (2026-10-20)

This entry supersedes the browser-acceptance blocker immediately above. The existing solid previews, crossfade and hysteresis were tested without changing application source.

### Startup diagnosis

The previous trace stopped during initial module loading: 32 requests (including Supabase service modules, R3F/Three dependencies and museum modules) were unfinished before navigation timed out. It did not show a museum runtime exception or a failed GLB as the cause.

A test-owned Vite instance on port 5197 was probed directly, without executing Auth or accessing a live backend. HTML, main.tsx, SupabaseAuthService, ShowcasePreview, hardwarePreviewGeometry, CSS and the R3F dependency all returned HTTP 200 in **10–251 ms**. This also warmed the dependency/module graph; Vite subsequently reported a consistent dependency hash. The ordinary browser configuration then loaded the museum successfully on consecutive runs. No cache deletion, dependency reinstall, global setting or unrelated application change was needed. The earlier cold-start/module-serving stall was not reproduced after this warm-up; its deeper OS/process cause is not established, so this is not a claim that every possible Vite cold-start issue has been fixed. Ignored diagnostic evidence: `.tmp/phase08-acceptance/startup-diagnostic.mjs` and `startup-requests.json`.

### Confirmed test correction

Once the browser reached the scene, the first scenario exposed a test-counter error: the two-model **corridor** budget incorrectly counted the separately persistent CPU showcase. `read` and the animation sampler now exclude the CPU category from that corridor counter. The assertion remains **at most two generic physical GLBs**; it was not relaxed to three, and no extra real model was allowed in the renderer. CPU material checks remain separate. No application regression requiring a source fix was found.

The existing visual scenario was also extended to save explicit far/near captures for GPU, RAM and Motherboard, while keeping its original checks and five preview variants. No new browser scenario or full suite was introduced.

### Results

**All three existing showcase-final scenarios passed serially with one Edge worker** (40.4 seconds for the three-case run):

| Scenario | Result |
| --- | --- |
| Bidirectional opacity continuity, reveal/load hysteresis, pair retirement/handoff, two-model corridor cap, carousel UUID and Inspect entry/exit | Passed |
| Five solid category previews, zero distant generic GLB requests, optional same-item thumbnail, rendered CPU-fixture material flags | Passed |
| Genuine HTTP 404, retained unavailable state after recession, populated versus empty states, no invalid-model Inspect | Passed |

Only the visual scenario was replayed after adding the requested per-category capture pairs; it passed in 14.6 seconds. These are three distinct scenarios, not four. Changed-test ESLint and diff whitespace checks passed. No application source changed in this acceptance pass, and no broader regression run was performed. A production build/preview fallback was unnecessary because the dev scene loaded; no build was run.

### Visual inspection and evidence

Actual rendered browser captures were opened and inspected for GPU, RAM and Motherboard. GPU fan rings/blades and connector, RAM chips/gold contacts, and motherboard socket/slots/capacitors are recognizable solid shapes; they remain populated after moving away. Close preview captures and corresponding far views do not revert to hollow cyan rectangles. Animation-frame assertions observed intermediate alpha in both directions and maintained opacity coverage while oscillating around the distance deadbands. Screenshot inspection complements those checks; it is not a physical-device or every-frame pixel-difference certification.

Ignored evidence under `.tmp/phase08-showcase-final/`:

- `preview-0.png`, `preview-1.png`, `preview-2.png`: close GPU/RAM/Motherboard procedural previews while the real asset response is held.
- `preview-far-0.png`, `preview-far-1.png`, `preview-far-2.png`: corresponding receded views.
- `real-near-0.png`, `real-near-1.png`, `real-near-2.png`: near GLB rendering with completed crossfade.
- `near.png`, `receded.png`, `far.png`, `failed.png`, `cpu-fixture.png`: additional state captures.

The real-near captures intentionally use the controlled **green Box GLB fixture**, not the user's downloaded GPU/RAM/Motherboard or CPU assets. They verify GLB loading/presentation and transition plumbing, not the semantics or materials of inaccessible private uploads. The CPU fixture retains opaque, depth-writing, non-wireframe materials, but **the actual CPU GLB remains unverified and its reported hollow-green appearance is not signed off**. No speculative CPU material/asset changes were made.

Reproduction:

```powershell
$env:RAYON_NUM_THREADS='2'
node node_modules/@playwright/test/cli.js test --config tests/showcase-final.playwright.config.ts
```

Only `tests/showcase-final.spec.ts` and this report changed during acceptance. Landing, museum camera ownership, CMS, backend and the current completed application work were preserved. **Focused frontend visual acceptance passes; real CPU asset acceptance remains separate. Phase 08B has not started.**

## Phase 08B — Entrance opening gallery (2026-10-20)

### Scope and result

The user explicitly authorized Phase 08B in the new Entrance brief and supplied a visual reference. This supersedes the earlier stop-before-08B boundary **only for the Entrance**. The Entrance is now a graphite/bronze opening gallery with a polished dark mineral floor, amber architectural trim, layered ceremonial doorway, orbital ceiling pendant, illuminated glass vitrines, and concise bilingual interpretation graphics. Passage and CPU Hall have not been redesigned.

Six lightweight **educational design studies** introduce a vintage terminal, processor, graphics card, RAM, motherboard and disk storage. They are environmental illustrations, not invented published records, selectable catalog exhibits or replacements for uploaded GLBs. All six cases are beyond the existing ±5.5 m Entrance walking envelope; their closest frame edge is at ±5.59 m. The central route remains open, including the existing rear extension for additional category showcases.

Five wall panels explain Processor, Graphics, Memory, Storage and Motherboard with corresponding restrained hardware engravings. The left introductory panel reads “Computing connects us” and introduces machines, ideas and people; its thematic footer references existing Exhibitions, Collection and Guided Tour features. These are exhibition graphics, not fake menu destinations. CORE / The Connected Archive / Interactive Computer Museum branding frames the original Passage sightline. Two limited historical panels introduce Ada Lovelace's 1843 notes and Alan Turing's 1936 universal-machine concept; the locally served portraits total approximately **196 KiB**, with provenance, public-domain references and content sources in the asset README. The portrait dates are distinct from the work dates on the panels.

### Architecture and performance decisions

- `EntranceGallery` replaces only the former Entrance geometry inside `MuseumArchitecture`. The Passage/CPU JSX suffix, rear category-extension logic, route, collision implementation and navigation owner are retained.
- Repeated wall, plinth, frame and trim boxes are merged into **four finish batches**. Hardware reuses the existing low-poly preview geometry builder; there are **no new GLB requests**, dependencies or backend contracts.
- One existing-style **256px planar floor reflection** is retained on desktop; mobile uses a simpler standard material. Procedural mineral veining requires no network texture. Glass uses low-opacity standard materials, without transmission/refraction passes or shadows.
- Only the suspended orbital element moves slowly. It honors reduced motion, atmosphere pause, paused in-progress tours, hidden documents, Inspect and overlays. It never reads or writes camera transforms.
- Panel textures redraw after font readiness, locale changes and portrait loading; demand rendering is invalidated for reduced-motion views. Async callbacks are guarded after unmount. Owned textures, merged geometries and materials are disposed on exit.
- Visual review corrected an initially over-dark floor and a pendant key light positioned inside its sphere; the final captures show floor reflections and a lit solid orbital centerpiece. RAM was fitted within its glass enclosure and displays have explicit support stems.

### Exact files changed in this task

1. `src/experience/MuseumArchitecture.tsx` — connect the Entrance module, retain existing Passage/CPU and rear extension.
2. `src/experience/EntranceGallery.tsx` — Entrance composition, floor, ceiling pendant, cases, local lighting and EN/FA content.
3. `src/experience/EntranceArtifacts.tsx` — batched architectural finishes and educational hardware/terminal props with owned resource disposal.
4. `src/experience/EntrancePanels.tsx` — localized, font-aware canvas graphics and local portrait textures.
5. `public/images/museum/entrance/ada-lovelace.jpg` — 500px public-domain portrait derivative.
6. `public/images/museum/entrance/alan-turing.jpg` — 500px public-domain portrait derivative.
7. `public/images/museum/entrance/README.md` — image provenance, licensing references and historical copy sources.
8. `tests/entrance.playwright.config.ts` — focused serial Edge/Vite configuration, reusing existing fixtures/configuration.
9. `tests/entrance.spec.ts` — four Entrance scenarios and requested screenshots.
10. `docs/phase08/PHASE_08_PROGRESS.md` — this record.

### Focused verification

**Final browser run: 4/4 passed, one Edge worker, 36.9 seconds.** No full regression suite was run.

| Scenario | Evidence |
| --- | --- |
| Desktop arrival | Six cases outside the walkable envelope, eight interpretation panels, ceiling hero, one Canvas, EN controls, two local portrait resources, zero storage GLB requests and no page exceptions. On route exit all **17 tracked new resources** dispose: nine graphic/floor textures plus four batch geometries and four batch materials. |
| Movement and saved Entrance | WASD movement stays in the Entrance; actual reload restores Free Explore position and quaternion. Subsequent Q look uses the existing camera owner and captures the vitrines. |
| Entrance → Passage | Existing guided route approaches the doorway, Space pauses/resumes, camera settles to the paused target, then crosses into the Passage continuously with one Canvas. |
| Mobile portrait | 390×844 touch emulation, EN and FA/RTL, no horizontal page overflow, frozen reduced-motion orbital element, simple mobile floor and touch-held forward movement. |

The first development pass had two test timing failures: restoration was sampled before its readiness barrier, and pause was sampled during the existing camera damping. Tests now wait for the established ready phase and allow the original camera to settle before checking that it stays fixed; pose, quaternion and pause assertions remain strict. All four passed after that correction, then passed again after the final visual/resource changes. No camera or persistence code was changed to satisfy these tests.

`tsc -b` and ESLint for all six changed/new TS/TSX files passed. **One final `npm run build` passed** (Vite production bundling: 25.01 seconds). It reports the existing large application chunk / ineffective dynamic-import warnings; no new dependency or bundler workaround was added. Test Vite started normally; no startup recovery or production-preview fallback was needed.

Preservation checks compared pre-task file hashes: `MuseumNavigation.tsx`, `navigationState.ts`, `museumCollision.ts`, `CorridorExhibitions.tsx`, `CPUHall.tsx` and `package.json` are unchanged. The Passage/CPU architecture suffix is byte-equivalent after text decoding. Ignored evidence: `.tmp/phase08b/baseline-hashes.json` and `preservation-checks.json`. No Landing, CMS, Auth/RBAC, Supabase, data, migration or security files were modified.

### Screenshots and visual acceptance

The following actual browser renders were opened and inspected (ignored local evidence under `.tmp/phase08b/`):

- `01-entrance-desktop.png` — initial symmetrical arrival, orbital ceiling, bilingual-capable interpretation, cases and floor reflection.
- `02-entrance-vitrines.png` — Free Explore view of terminal/GPU/RAM, glass frames, interpretation panels and passage doorway.
- `03-entrance-doorway.png` — paused approach toward the preserved Passage.
- `04-entrance-mobile-en.png` — portrait EN arrival with existing compact overlays.
- `05-entrance-mobile-fa.png` — portrait FA/RTL after touch movement, reduced motion and simplified mobile floor.

The reference was adapted to the existing room and camera route, not recreated as a photorealistic asset pack. Props are recognizable procedural design studies, reflections are intentionally low-resolution/soft, and mobile does not render planar reflections. Narrow views prioritize the forward sightline; side interpretation/cases require looking around rather than fitting the whole gallery into the initial portrait frame. Mobile verification used Edge touch emulation, not a physical phone. Full museum regression and private real-CPU-GLB acceptance remain outside this focused Entrance pass; the earlier actual CPU asset limitation is unchanged. **Phase 08B Entrance implementation is complete; stop here.**

## Visual realism and polish mission — 2026-10-24

The new user mission authorizes visual polish of the existing Entrance/Passage, preserving their layout, camera/navigation, data and backend. Continued the existing Phase 08B working tree. Added generated IBL, procedural PBR surfaces/roughness, smoother imperfect floor reflection, warm local light pools, inexpensive contact AO, tiered atmosphere, framed layered EN/FA wall graphics, animated/camera-facing environmental prototypes, reflective Fresnel-like glass and a compact HUD with Details closed by default. Static Passage batching pays for the additional visual work. No new dependency/network artwork or portrait replacements.

Full audit, exact files, quality tiers, before/after renderer numbers, screenshots and limitations: [`docs/museum/VISUAL_REALISM_PASS.md`](../museum/VISUAL_REALISM_PASS.md). Requested PNG/JSON evidence lives under `docs/museum/visual-pass/`.

- High desktop full-frame calls: Entrance **578 → 506**, Passage **339 → 149**. Low mobile: **261 → 194**, **165 → 131**. Calls meet both budgets; extra high Entrance triangles are documented.
- **11 museum integration + 7 focused unit tests passed**. Four distinct focused after browser cases passed in serial targeted runs, including motion/reduced motion, HUD/FA/touch targets, Space, Inspect camera return, WebGL recovery and 60-second walking memory. Memory held at **105 geometries / 35 textures**. One existing Landing scroll/entry/reload/cleanup browser case also passed.
- Typecheck, changed-file lint and production builds passed. Full `npm run lint` retains the same two pre-existing `LandingIntro.tsx:291/:612` errors; no Landing fix or suppression was made. Generated lighting/LTC code is lazy-loaded only in the museum. Existing build warnings remain.
- No console errors/page exceptions in final fixed-view acceptance. A shared WebGL X4122 precision info log also reproduces on the unchanged Landing, alongside existing renderer deprecations; not a clean-console certification. Physical-device FPS and private CPU asset appearance remain unverified.
- Checked 77 protected source files: Landing, camera owner/state/route/collision, CPU Hall/schematic, GLB pipeline, CMS/auth/services/Supabase and package contracts remain unchanged.
- Camera inertia/breathing/FOV work was **deliberately stopped** under the mission's explicit navigation prohibition. It requires separate authorization; no camera changes or new camera writer were introduced. Stop after this visual mission.

## Phase 08B — Entrance wall layout correction — 2026-10-28

Root cause: poster slots and column positions were independently authored; intermediate columns crossed frame bounds, and the rear poster had a different spacing interval. The original mounting height also intersected transverse ceiling trim.

`entranceWallLayout.ts` now derives both walls from the existing 19 m wall and fixed edge columns at Z 3.4 / 19.2. Their inner edges leave **15.64 m** usable length. With unchanged **2.858 m outer beveled frames**, **0.16 m columns** and **0.30 m equal outer margins**, `L = 2M + 4P + 3C + 6G` gives **G = 0.521333 m** per side of each separator. Poster centres: **5.209, 9.269667, 13.330333, 17.391**; intermediate columns: **7.239333, 11.3, 15.360667**. Both walls mirror these coordinates. Uniform centre Y **3.075 m** leaves 0.15 m below the lowest transverse light strip. Poster content, dimensions, artwork and materials are unchanged. Six cases and their local floor contact effects follow their existing matching poster slots; X positions and walking boundaries remain unchanged.

Files: new `src/experience/entranceWallLayout.ts`; updated `EntranceGallery.tsx`, `EntrancePanels.tsx` (frame mesh name for measurement), `entranceBayMap.ts`, `MuseumAtmosphere.tsx`; new `tests/entrance-layout.spec.ts` and config; existing `tests/visual-pass4.test.ts` slot expectation now follows the shared calculation. This progress entry and three PNGs under `docs/phase08/entrance-layout/` complete the evidence.

Verification: **one actual-geometry check passed**, measuring generated frame/merged column/trim/light vertex bounds, four mirrored frames per wall, equal spacing/margins, centred separators, six aligned vitrines and walking clearance. **One focused visual case passed**; opened and inspected `center.png`, `left.png`, `right.png`. The initial hardware-WebGL capture lost its context and was rejected despite the test runner reporting success; added renderer-readiness/context-overlay assertions and reran only the visual case once using test-only SwiftShader. Final captures show the scene, with no page exceptions. TypeScript and changed-file ESLint passed. No broad suites or production build were run.

Limitations: no recording accompanied this request. Final visual acceptance uses desktop software WebGL, not hardware-GPU reliability or mobile certification. No camera/navigation, Passage, CPU Hall, Landing, content/translation, CMS, Auth, backend, package or asset replacement changes were made for this correction; prior uncommitted work was preserved. Stop after this correction.

## Cinematic Elevator Doors Gallery — 2026-10-28

The Gallery action now appears only for a published selected UUID whose enabled gallery contains associated, nonempty image records. Catalog hydration joins `gallery_images.item_id` to the item ID in existing database sort order and ignores empty storage paths; covers, models and descriptions never supply gallery media. The existing catalog refresh resolves the list again, and changing item or gallery identity tears down pending loads and the overlay.

`GalleryOverlay` now hosts a CORE graphite/amber DOM elevator with a scrollable numbered index, EN/FA controls and actual catalog captions. `useElevatorGallery` owns one GSAP context/timeline: close (0.44 s), travel (0.7 s), commit/load behind closed doors and open (0.62 s); rapid selections coalesce to the latest request. A single image element expands and returns with uniform scaling (0.52 s), so neither its identity nor aspect ratio changes. Reduced motion settles immediately. Loading and image failure are distinct; failure permits retry and navigation. Only the next image is preloaded. MuseumOverlay retains the Canvas and navigation lock, confines focus, locks scrolling, handles Escape in two stages and restores the initiating focus after cleanup, including React Strict Mode.

Files: `src/features/gallery/{GalleryOverlay.tsx,useElevatorGallery.ts, galleryImages.ts,elevatorGallery.css}`; `src/pages/Museum/MuseumPage.tsx`; `src/features/museum/{MuseumOverlay.tsx,exhibitPresentation.ts}`; `src/lib/services/supabase/SupabaseMuseumItemsService.ts`; museum EN/FA locale files; `tests/elevator-gallery.spec.ts` and its Playwright config; updated gallery expectations in `tests/museum-final-qa.spec.ts`. Three test-fixture captures are in `docs/phase08/elevator-gallery/`.

Verification: **four focused browser scenarios passed**, in targeted runs: unresolved/empty/disabled and foreign-UUID galleries; closed-door source switching, rapid choices, Step Inside/return, focus/camera/Canvas preservation and an in-flight item switch; a failed image, retry, selection and catalog refresh; and 12-image Persian mobile with reduced motion and keyboard selection. One existing targeted presentation unit test also passed, preserving direct Node TypeScript imports. The first run exposed a return-focus defect and a software-rendering timeout; the focus implementation was corrected and affected scenarios rerun. The follow-up exposed Strict Mode opener restoration and a cached-image test assumption; both were corrected, and the final affected case passed with a genuinely held uncached request. Typecheck, changed-file ESLint and one production build passed; the existing large-chunk and mixed dynamic/static import warnings remain. An initial typecheck briefly saw an unrelated unused Assembly type while that file was being edited separately; the final build passed without changing that file for this task.

The supplied message did not include the two videos or standalone component source; the public reference page and its described interaction were used, so no frame-by-frame video comparison was possible. Browser verification used mocked Supabase data, local existing images and desktop software WebGL/mobile emulation, not production data or a physical device. No database, security configuration, package, external asset or unrelated museum scene was changed. Stop after the gallery redesign.
