# CORE — Phase 07 Progress

## 07A — Connected Museum & Navigation

Completed locally: **2026-10-17**. Scope ends at 07A; detailed CPU Hall interiors and educational interactions are not implemented.

### Visible implementation

- A walkable graphite entrance vestibule opens into a continuous framed corridor and signed CPU Hall arrival shell. Coffered ceiling, charcoal floor, restrained amber inlays, architectural lighting and closed Memory/Graphics future-gallery bays establish the connected route.
- A user-started guided tour travels the route in approximately 16 seconds. Pause, skip and destination controls are available. Free Explore takes over from the current camera pose; returning to guided navigation rejoins the nearest route point.
- Desktop: WASD/arrows move, drag looks, Q/E turn. Touch: destination shortcuts, drag-look and hold-to-move forward/back controls. Controls and hints are English/Persian, including RTL layout.
- Physical boundaries constrain the entrance, corridor throat and CPU landing. Frame deltas are capped; blur/visibility changes clear held movement. Pointer capture and owned event listeners are cleaned up on exit.
- Reduced motion disables automatic flight between destinations and uses direct positioning. Demand rendering still responds to deliberate movement. Desktop DPR is capped at 1.5; mobile/coarse-pointer rendering uses a 1.15 cap, no antialiasing and no reflective floor. Only one low-resolution floor reflection is used on desktop; no particles, post-processing or shadow-map passes were added.

### Architecture and preserved contracts

MuseumNavigation is the sole connected-scene camera writer. Its owned GSAP tween drives route progress; the frame loop applies the camera pose. Physical navigation has its own small Zustand store, separate from catalog progress and selected exhibit UUIDs. MuseumLayout no longer mounts the legacy useMuseumJourney ScrollTrigger; collection selection calls the existing catalog store directly, so scrolling cannot fight guided/explore controls.

The existing published/active catalog facade, request ownership, UUID selection, GLB URL validation, fitting, cloned models, model statuses and retry behavior remain in use. The selected exhibit renders on the arrival display; an empty catalog produces no fabricated exhibit or procedural CPU record. Load errors can be retried from the entrance as well as the CPU arrival. Catalog section selection remains database-driven; architectural destination names do not create taxonomy rows or imply published CPU content.

MuseumCanvas is shared with AuthLayout, so the new architecture/navigation is explicitly opt-in via connected. Auth retains its independent decorative CORE scene. Landing source, routes/guards, Auth/CMS services, Supabase configuration, migrations and security gates were not changed.

### Changed files

- Architecture/camera: src/experience/MuseumArchitecture.tsx, MuseumNavigation.tsx, MuseumScene.tsx and MuseumCanvas.tsx. PortalFrame is reusable for later hall thresholds.
- Navigation state/UI: src/features/museum/navigationState.ts, MuseumNavigationControls.tsx and museumNavigation.css.
- Composition: src/layouts/MuseumLayout.tsx and src/pages/Museum/MuseumPage.tsx (viewport layout and mobile information-panel sizing).
- Localization: src/i18n/locales/en/museum.json and fa/museum.json.
- Checks: tests/museum-navigation.test.ts, museum-navigation.spec.ts and museum-navigation.playwright.config.ts.
- Documentation: this file.

### Verification

- TypeScript typecheck: passed. Final production build (including tsc -b): passed.
- Focused ESLint on all changed TypeScript components/state/tests: passed. git diff --check: passed.
- Native: **14 passed** — three new navigation/boundary/state tests plus the eleven existing museum integration/model-fitting tests.
- Browser: **five distinct scenarios passed** — desktop tour interruption/explore/boundary/cleanup; mobile native emulated touch hold, Persian layout and selected GLB; reduced-motion destinations/no autoplay/no museum ScrollTrigger; complete guided arrival; entrance catalog failure/recovery. Affected cases were rerun after confirmed focus, demand-render initialization and layout fixes; reruns are not additional distinct cases.
- Visual review: desktop 1280×720 entrance/corridor/CPU arrival and mobile 390×844 Persian view. Preview capture: .tmp/phase07-preview/entrance-desktop.png.
- Browser checks use an isolated Vite process, controlled REST/GLB fixtures and an injected test Auth state; non-local HTTP is blocked. They verify frontend behavior, not live Supabase/RLS or real-device GPU performance. No accounts, exhibits or assets were created or changed.
- Build reports a large main bundle and an ineffective existing service dynamic import; R3F/Three reports a Clock deprecation warning. These are nonblocking and were not addressed through unrelated refactoring. No full regression matrix was run.

### Preview and next boundary

Run npm run dev, sign in normally, and open /museum. Choose Guided tour, pause or Skip to CPU Hall; choose Free Explore for keyboard/drag controls. On mobile use the three destination controls and assisted movement buttons. To reproduce isolated navigation checks, run npx playwright test --config tests/museum-navigation.playwright.config.ts; native checks use node --test tests/museum-navigation.test.ts tests/museum-integration.test.ts.

The CPU space is intentionally only an arrival shell with the existing selected-exhibit display. At the 07A handoff, 07B had not yet started. The implementation below extends that hall using the same structural vocabulary and camera ownership. Collision uses bounded walkable zones rather than a physics engine; steps, jumping, pointer lock and detailed hall interactions are outside 07A.

## 07B — Living Museum & Cinematic CPU Hall

Completed locally: **2026-10-17**. Frontend only. At the 07B handoff, 07C had not started; its result follows below.

### Visible implementation

- **Brand:** 3D architecture reads the existing shared CSS semantic tokens through museumPalette: primary orange #ff7a18, supporting amber #ffb547 and restrained cyan #55e6e6. Overlay highlights use those same variables. The landing and shared token definitions were not edited.
- **Entrance:** offset suspended ceiling lattice, recessed stone panels, technical markers and seating give the vestibule a more substantial first impression. **Passage:** alternating wall reliefs/recesses, suspended service vanes and proximity-reactive light spines create progression toward the CPU threshold. Small frame-loop motion is deliberate and restrained; no particles or extra post-processing.
- **CPU Hall:** doubled threshold, folded metal wall fan, layered ceiling, dark glass fins, visitor concourse and suspended illuminated ring surround a reusable ExhibitionPedestal. The approach progressively brightens the display and raises its upper plinth a restrained distance. The existing MuseumNavigation remains the only camera controller; its approach supplies the cinematic spatial reveal.
- **Preview:** an empty ready selection renders a clearly labeled procedural CPU with beveled heat spreader, brushed surface, circuit traces and instanced pins. It is architectural demonstration content only: no exhibit UUID, database row or catalog stop is fabricated. Loading/error states do not claim a preview is published. When an actual exhibit is selected, its existing UUID, model URL, fitting, cache, loading/error boundary and retry flow take precedence; no procedural preview is layered over it. The hall continues to honor the selected catalog item rather than inventing hardcoded taxonomy IDs.

### Navigation and responsive overlays

- ArrowLeft = Back/previous destination; ArrowRight = Forward/next destination. Both buttons and shortcuts call the same step action. Reversal during a pending leg is supported; held-key repeats do not restart transitions. Form controls, contenteditable fields, modifier shortcuts and dialogs retain keyboard ownership. Owned global listeners clean up on route exit.
- Explore retains WASD, ArrowUp/Down movement, drag-look and Q/E turning. Left/Right no longer strafe. Assisted hold buttons work with pointer capture and keyboard hold/release. Guided pause, skip, bounds and route selection remain available.
- Desktop groups wayfinding and mode controls outside the central display. Mobile starts with a compact bottom bar and an expandable, scrollable control area; exhibit details and the empty-catalog notice use native collapsible disclosure. Safe areas, RTL/LTR and short landscape viewports are handled. Portrait camera FOV widens to 70 degrees without resetting position on resize. Catalog errors remain visible outside the collapsed navigation.
- Pause atmosphere freezes decorative motion and the reveal; pausing an in-progress guided tour also freezes its environmental motion. Reduced motion places destinations and reveal directly, removes idle movement and retains demand rendering.

### Performance and preserved systems

Architecture shares unit-box geometry and cached metal/emissive materials under one resource owner. CPU pins use one instanced draw call; procedural textures are generated once and disposed. Architecture disposal never touches cached GLTF resources. Existing DPR caps remain 1.5 desktop / 1.15 mobile, with mobile antialiasing and floor reflection disabled. Desktop retains one 256-resolution reflector; no shadow maps, physics engine, new dependencies or expensive transmission/post-processing were added.

Landing, Auth, CMS, services, migrations, Supabase resources and security gates were not changed. Existing uncommitted 07A work was retained.

### Files changed in 07B

- Architecture: MuseumArchitecture.tsx, new CPUHall.tsx, MuseumPrimitives.tsx, MuseumResources.tsx, architectureResources.ts and museumPalette.ts under src/experience; MuseumScene.tsx, MuseumCanvas.tsx and MuseumNavigation.tsx integrate the scene and framing.
- Navigation/UI: src/features/museum/navigationState.ts, new navigationKeyboard.ts, MuseumNavigationControls.tsx and museumNavigation.css; src/layouts/MuseumLayout.tsx; src/pages/Museum/MuseumPage.tsx; en/fa museum.json.
- Checks: tests/museum-navigation.test.ts, museum-navigation.spec.ts and museum-navigation.playwright.config.ts (explicit repository cwd and direct local Vite executable).
- Documentation: this existing progress file only.

### Verification and limits

- **15 native tests passed:** four navigation/boundary/state cases plus eleven existing catalog/model-fitting cases.
- **Seven distinct browser scenarios passed:** desktop tour/explore/bounds/cleanup; mobile native touch, bilingual controls and genuine selected GLB fixture; reduced motion/no competing ScrollTrigger; full guided arrival; failed catalog/recovery; Back/Forward ownership/repeats; responsive overlays. Affected scenarios were rerun after the mobile test was updated for the intentionally collapsed controls and visual framing/spacing improvements; repeats are not additional tests.
- Responsive checks cover 360×780, 390×844, 430×932, 844×390 landscape, 768×1024 tablet and 1440×900 desktop in English/Persian. Desktop entrance/passage/CPU and mobile portrait/landscape captures were inspected; CPU tilt and overlay spacing were corrected from that review. Captures are in ignored .tmp/phase07-preview/07b-*.png.
- Final TypeScript typecheck (including tsc -b in the build), production build, focused ESLint (zero warnings/errors) and git diff --check all passed. The build still warns about the large main chunk/ineffective service dynamic import; Three reports its Clock deprecation. These unrelated warnings are not security failures.
- Browser checks use intercepted catalog/GLB fixtures, an injected frontend test session and blocked external HTTP. They do not verify live Auth/RLS/Storage or real-device GPU performance. The sandbox prevented browser-server startup; the scoped local checks ran successfully with execution approval. No production or local database records were modified.

### Preview and 07C boundary

Run npm run dev, sign in normally and open /museum. Start Guided tour, pause/skip or use Back/Forward; expand Navigation controls on mobile to enter Free Explore. Empty catalogs show the procedural architectural CPU. Preview labels and catalog information remain available through the disclosure panel.

Remaining: detailed exploded-view education, hotspots and CPU learning interactions belong to 07C. Collision still uses the preserved bounded zones rather than physics; free movement remains on the front visitor concourse. Physical-device performance and real published asset visual acceptance remain separate checks. Stop here after 07B.


## 07C — Interactive CPU Experience & Final Museum Polish

Implemented locally: **2026-10-17**. Phase 07 ends here; Phase 08 is not started. One recording-specific visual issue remains explicitly unverified below.

### Learning experience and architecture

- Inspect / Exit Inspect, bounded mouse/touch orbit, wheel/pinch zoom, keyboard orbit/zoom, reset view and Escape exit are implemented inside the existing MuseumNavigation camera owner. Guided/explore input is suspended while inspecting. Entry stores the actual position/quaternion and prior navigation mode/playing state; exit restores that pose before resuming the previous mode. Projection shifts reserve space for portrait controls and account for the side panel switching sides in RTL landscape. Changing reduced-motion preference does not overwrite the saved return pose.
- CPUSchematic replaces the architectural preview with a reusable five-layer learning model: heat spreader, exaggerated thermal interface, silicon die, substrate and instanced contacts. Assembly/explosion is reversible with bounded, ordered layer offsets; reduced motion applies the chosen separation directly. It is an illustrative pin-style package, not a manufacturing drawing or a claim about a specific published CPU.
- Six local hotspots use CPUHotspot records containing a unique id, a semantic component reference, localized title and localized explanation. Shared component keys connect the configuration, clickable 3D layer groups, one active highlight and accessible UI controls. Only one explanation is shown at a time. Closing, reselecting and language/viewport changes preserve readable information; no hotspot schema or fake exhibit identity was added.
- **Inside the Processor:** separates the package and progresses through the physical roles of its layers. **Heat Transfer:** an independent schematic path with three restrained moving bands connects the die, thermal interface and lid. Both support pause, continue, replay, reset and completion. The heat view explicitly illustrates a path rather than simulated temperature/speed. Reduced motion uses stationary path cues. Playback controls remain accessible while the information body scrolls.
- Published GLBs remain intact, fitted and cached through the existing pipeline. Inspect defaults to the selected ready model. Lessons switch to an explicitly independent learning schematic; the real model stays mounted but hidden, with unchanged geometry, transforms and UUID. Returning to Selected model restores visibility. Missing models can use the labeled schematic; catalog loading/error messages retain their existing meaning. Source selection changes close inspection safely.

Introductory educational references: [Intel thermal interface explanation](https://www.intel.com/content/www/us/en/support/articles/000037164/processors/intel-core-processors.html) and [Intel processor package guide](https://www.intel.com/content/www/us/en/support/articles/000005670/processors.html). These support the introductory package descriptions, not this model's illustrative dimensions.

### Museum and mobile polish

- A single kinetic logic seal creates a corridor midpoint landmark without rebuilding the passage. Approach feedback remains restrained. Inspection slows background motion, dims ambient fill and increases pedestal emphasis; exit restores the surrounding presentation.
- CPU threshold lettering fades during approach; large rear-wall lettering is omitted on mobile and quieted during inspection. Mobile heading/card spacing is consolidated rather than stacking large titles and badges over the artifact. The compact navigation is retained outside inspection.
- Portrait learning uses a scrollable compact bottom sheet; short landscape uses a side panel with RTL-aware camera space. No second canvas or orbit controller was added. A repeat-selection/locale scroll issue found during visual QA was fixed using owned animation-frame/ResizeObserver cleanup. The unchanged test now requires the entire explanation paragraph to be inside the viewport.

### White-floor investigation — remaining evidence limitation

The referenced 07B recording was not attached to this request, so its specific frame around 30 seconds and root cause could not be verified. Direct browser ray/pixel probes identify the current entrance/corridor floor as MeshStandardMaterial, color #30363b, on actual emulated touch portrait and landscape layouts. At entrance z=10 the sampled output is RGB(15,20,24); at corridor z=-8 it is RGB(30,24,25), in both orientations. Captures: ignored .tmp/phase07-preview/07c-floor-390.png and 07c-floor-844.png. The test checks surface identity as well as a non-white sample; this is not proof about every pixel or the missing historical recording.

The original almost-white floor event was **not reproduced or declared fixed**. Walkthrough floor materials, reflector settings and normal lighting were preserved instead of applying an unsupported material/exposure workaround. The desktop entrance reflector remains disabled on touch/mobile. Inspection-specific mood/framing changes are separate from these walkthrough checks. Exact diagnosis of the historical event requires the referenced clip and, if model-dependent, its selected asset.

### Performance, accessibility and integrity

One WebGL canvas, existing DPR caps and shared architectural resources remain. Instanced contacts, small reusable geometry and frame-loop transforms avoid continuous animation-driven React renders. Lesson timing uses the existing GSAP dependency; state changes occur at controls/subject boundaries rather than every frame. Demand rendering invalidates deliberate movement and lessons; listeners, observers, scheduled frames and timelines clean up. GLTF cache resources are never disposed by the schematic. Orbit stays within a constrained inspection envelope; it is not unrestricted room navigation.

English/Persian instructions, keyboard focus on entry/return, semantic buttons/disclosures, modifier/form/dialog input ownership and touch-action rules are preserved. Introductory content is structured locally for later CMS mapping. No dependencies, backend/schema/security changes, real account edits, uploads or database writes were made. Pre-existing changes in guards, PermissionDenied, mock museum data, audio, museumState, ProfilePage and the SQL snippet were preserved; their recorded hashes match the start of 07C.

### Changed files in 07C

- New experience components: src/experience/CPUSchematic.tsx; src/features/museum/CPUExperienceControls.tsx, cpuEducation.ts, cpuExperienceState.ts and cpuExperience.css.
- Integration: src/experience/CPUHall.tsx, MuseumScene.tsx, MuseumNavigation.tsx, MuseumArchitecture.tsx, MuseumPrimitives.tsx; src/features/museum/navigationState.ts and MuseumNavigationControls.tsx; src/layouts/MuseumLayout.tsx; en/fa museum.json. Existing MuseumCanvas/GLB helper behavior was preserved.
- Tests: new tests/museum-cpu.test.ts, museum-cpu.spec.ts and museum-browser-fixture.ts; existing museum-navigation.spec.ts now reuses that fixture, and its Playwright config includes the CPU suite.
- Documentation: this existing progress file only.

### Verification

- **18 native tests passed:** three CPU state/content/layer-order cases, four existing navigation cases and eleven catalog/model-fitting cases.
- **14 distinct browser scenarios passed:** seven CPU cases (camera/restore; ordered explosion and actual 3D hotspot hit; both lessons; unchanged real GLB; touch/bilingual layout; reduced motion; floor provenance) plus the seven existing navigation scenarios. Only affected cases were repeated after confirmed layout fixes; repeats and viewport/language subcases are not additional tests.
- Visual inspection: desktop assembled/exploded/heat views, 360/390/430 portrait and 844×390 landscape, with English/Persian behavior and revised RTL composition. Captures: ignored .tmp/phase07-preview/07c-*.png. The original 07B-style empty-catalog navigation, tour, error recovery and selected GLB checks remain passing.
- TypeScript typecheck, production build, focused ESLint and git diff --check: passed after final changes. Existing bundle-size/ineffective service import and Three Clock warnings remain nonblocking. No full unrelated regression matrix was run.
- All browser checks use intercepted REST/GLB fixtures and injected frontend test authentication with external HTTP blocked. They do not establish live Supabase/RLS readiness, authentic model-internal semantics or physical-device GPU performance.

### Handoff boundary

Preview: npm run dev, sign in, open /museum and visit CPU Hall. Choose Inspect CPU; use the real model tab when available, or the independent learning schematic, then choose a lesson or component. Focus 3D enables keyboard orbit/zoom; Escape or Exit Inspect returns to museum movement.

Phase 08 can reuse the camera ownership/return contract, semantic hotspot configuration, ordered schematic layers, playback controls and resource/disposal rules. Future real-model layer mapping must be explicitly verified per asset; arbitrary meshes must never be split based on names guessed at runtime. Known limits: constrained orbit/bounded walking, illustrative package geometry, no physical thermal simulation, no physical-device benchmark, no live asset acceptance and the unreproduced historical white-floor event. Do not begin Phase 08 automatically.

## Post-07C corrective QA — museum usability

Completed locally on **2026-10-17**. This is a targeted correction of Phase 07, not another phase. No Phase 08 work, database/security changes, uploads, account edits or dependencies were introduced.

### Confirmed causes and corrections

- **Pedestal clearance:** rectangular walking zones allowed the camera within 0.45 m of the platform edge. Movement now excludes the platform's 3.55 m radius plus 0.70 m visitor clearance. Swept steps of at most 0.12 m prevent crossing it during fast movement or large deltas; invalid entry/return poses and guided interpolation are constrained. Existing front-concourse boundaries and inspection orbit limits remain; no physics engine or new walkable halls were added.
- **Lettering:** the CPU threshold intersected overhead structure, rear lettering competed with the artifact and future-gallery signs sat behind columns/reliefs. The entrance label now occupies a dedicated transom fascia; rear lettering is raised and reveals after entering the hall; future labels sit on room-facing plaques. Actual Entrance, Passage and CPU viewpoints are checked with visibility rays. Text retains depth testing.
- **Artifact semantics and size:** the missing-model path reused the decorative orange CORE polyhedron without CPU classification. It now uses a neutral availability placard under 1.2 m wide and 1 m tall. CPU GLBs fit measured bounds within 2.8 × 2.3 × 2.4 m and radius 1.5 m, with their measured bottom above the 0.98 m pedestal plate. Wide, tall and irregular bounds are covered. Only compatible, hydrated CPU taxonomy slugs permit physical placement; unrelated/unknown classifications retain their selected UUID and metadata, with a visible metadata-only notice. The independent educational CPU schematic remains explicitly separate. Asset paths, GLTF caching and shared-resource disposal are preserved.
- **Gallery and AI input:** both inherited `pointer-events:none` inside a HUD stacking context below navigation. A shared body portal and one overlay owner now provide pointer access, focus trapping/restoration, Escape dismissal and suspension of camera input/gestures/tour playback. Gallery uses the existing ordered media and bilingual captions, handles loading/errors, honors feature flags and never promotes a thumbnail into gallery content. AI accepts native keyboard/touch editing and form submission; it remains explicitly labeled as prewritten demonstration responses from the existing local mock adapter, not live AI.
- **Overlay composition:** navigation and Inspect entry controls hide while a dialog owns interaction. VisualViewport sizing keeps the AI form accessible during a reduced mobile viewport; portrait/landscape and Persian RTL are covered. The desktop Inspect entry moved away from the expanded metadata card, with a non-overlap assertion. Opening a dialog clears held movement/gesture state; closing returns focus without changing the previous navigation mode.

### Changed files

- Camera/placement: `src/features/museum/museumCollision.ts`, `navigationState.ts`, `exhibitPresentation.ts`; `src/experience/MuseumNavigation.tsx`, `MuseumScene.tsx`, `MuseumCanvas.tsx`, `modelGeometry.ts`; `src/layouts/MuseumLayout.tsx`.
- Architecture: `src/experience/MuseumPrimitives.tsx`, `MuseumArchitecture.tsx`, `CPUHall.tsx`.
- UI: `src/features/museum/MuseumOverlay.tsx`, `museumOverlays.css`, `AICuratorPanel.tsx`; `src/features/gallery/GalleryOverlay.tsx`; `src/pages/Museum/MuseumPage.tsx`; English/Persian `museum.json` translations.
- Verification: `tests/museum-final-qa.test.ts`, `museum-final-qa.spec.ts`, `museum-browser-fixture.ts`, `museum-navigation.playwright.config.ts`; this progress document.

### Reproduction and verification

The reported journeys were reproduced through the actual museum components with controlled, intercepted catalog/media/GLB fixtures. Before correction, computed pointer ownership excluded both dialogs, the missing-model path mounted two large icosahedra, and checkpoint rays found blocked lettering. These cases now pass alongside actual keyboard typing/editing/submission, gallery pointer/arrow/close interaction, empty/disabled/broken media, non-CPU selection, swept collision, fitted GLB bounds and camera restoration. No existing catalog records were altered to manufacture results.

- **24 native tests passed:** six new corrective cases plus the eighteen existing navigation, CPU education, catalog and model-fitting cases.
- **25 distinct browser scenarios passed:** eleven corrective scenarios plus all fourteen existing navigation/CPU scenarios. This includes both lessons, hotspots, selected-model preservation, reduced motion, touch, RTL and Inspect return. Affected cases were rerun after final fixes; reruns and viewport variants are not additional scenarios. Browser execution remained under fifteen minutes; no unrelated full regression matrix ran.
- TypeScript typecheck, production build, focused ESLint and `git diff --check` passed. Existing bundle-size/service-import and Three Clock deprecation warnings remain nonblocking.
- Desktop and 390×844 / 844×390 Persian mobile captures were visually inspected, including AI input, gallery, missing model, metadata-only selection and actual signage checkpoints. Evidence remains ignored under `.tmp/phase07-preview/qa-*.png`. The small desktop Inspect/card composition correction was checked again after visual review.
- Pre-existing changes in guards, PermissionDenied, mock data, audio, museumState, ProfilePage and the SQL snippet retain their recorded hashes. Landing, backend services/migrations and Phase 06 gates were untouched.

### Remaining limits and preview

Controlled browser authentication and intercepted fixture URLs do not establish acceptance of a real authenticated session at port 5191, live Storage assets, Supabase RLS, physical-device keyboards or GPU performance. Canonical CPU classification is deliberately conservative; unknown/unrelated items remain metadata-only until a real hall/association exists. Walking stays in the existing front concourse. GLB fitting uses static measured geometry; it does not infer educational layers. The curator mock returns fixed example content. The previously documented historical white-floor recording remains unreproduced and is not claimed fixed here.

Preview the existing frontend at `http://127.0.0.1:5191/museum` and sign in normally. Visit CPU Hall, attempt pedestal approach in Free Explore, inspect/exit, expand exhibit details and open Gallery or Ask CORE AI. An unrelated catalog selection should show metadata-only labeling while CPU Hall retains its independent schematic. No new published data is required. Stop after this correction; do not begin Phase 08.

### Follow-up visual correction — exhibit clearance and CORE placeholder

The subsequent annotated screenshot identified a remaining schematic-placement problem: its tilted lower package extended below the nominal 1.65 m origin into the pedestal. The learning schematic now sits at 2.25 m; measured bounds are checked during Inspect. Uploaded GLBs now have their measured bottom at 1.35 m, leaving at least 0.435 m above the pedestal's highest plate (0.915 m), without changing their size limits, UUIDs or cached geometry.

The user's revised presentation preference supersedes the neutral placard/automatic CPU preview described above: missing/error/loading models, unrelated selections and an empty ready catalog now show a compact branded CORE emblem. `CorePreview.tsx` uses a dark metal polyhedral core with restrained amber edges, steel/amber orbital frames and localized placeholder labeling. No CPU is displayed automatically as the selected exhibit's substitute. CPU education remains available explicitly through Inspect; exiting restores the CORE placeholder. Non-CPU GLBs are still not misrepresented as CPU Hall artifacts, and their metadata/selection remain intact.

Changed: new `src/experience/CorePreview.tsx`; `MuseumScene.tsx`, `MuseumCanvas.tsx`, `CPUSchematic.tsx`, `modelGeometry.ts`; English/Persian museum copy; affected final-QA/native/navigation tests. Verification: 24 native tests and 10 distinct focused browser scenarios passed, covering exact missing-model Storage selection, bounded CORE preview, raised schematic and GLB, cached-model preservation, hotspots, desktop navigation, mobile learning and Persian overlays. Typecheck/production build, focused ESLint and diff checks passed. Existing build warnings and controlled-fixture/live-device limitations remain. Captures `qa-storage-core.png`, `qa-missing-model.png` and `qa-raised-cpu.png` were visually inspected. Backend/security and protected unrelated edits remain unchanged; no new phase was started.
