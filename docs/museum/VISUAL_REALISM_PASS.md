# Museum visual realism and polish pass — 2026-10-24

The existing Entrance/Passage composition, room dimensions, category positions, camera paths, stops, selection and GLB data flow have been retained. This work continues the uncommitted Phase 08B Entrance, without resetting it. No dependency, network-fetched artwork/model, database record, schema, migration, security or service change was made. Existing portrait files were not edited or re-sourced.

## Short audit before implementation

The connected museum used one Canvas: desktop DPR 1–1.5, mobile 1–1.15, antialiasing disabled on mobile, opaque background, no shadow maps. R3F supplied its default color pipeline; connected-museum exposure was not explicitly tuned. Auth's decorative scene is a separate branch of this same component, and Landing owns its existing monitor Canvas/GSAP logic.

At the baseline fixture there were **19 declared lights on desktop**: one ambient, one hemisphere, one directional (intensity 3), nine point lights and seven spots. Mobile omitted one rear CPU point light, giving 18. Many lights remained registered when the camera was far away. Thin basic-material inlays were bright geometry, not lights. No `scene.environment` was present, so metallic surfaces/glass had little useful reflected structure. Ambient .65 and hemisphere 1.5 flattened the lit areas while dark metal looked nearly black elsewhere.

| Surface | Before |
| --- | --- |
| Walls, trim, beams | Shared box geometry and flat standard-material color/metalness/roughness; no surface maps. Cool gray steel/portal colors produced pale beams against black voids. |
| Entrance floor | One 256px `MeshReflectorMaterial`, blur 45/15, mixBlur .55, mixStrength 1.8, roughness .23, metalness .3; canvas veins but no roughness variation. Reflection captured high-contrast beams/trim as blocky streaks. |
| Passage/CPU floors | Plain gray standard materials. |
| Cases | Transparent standard-material boxes, opacity .065, no environment; thin bronze mullions. Entire pedestal lids were luminous rectangles. |
| Case contents | Static procedural studies, five material batches for boards/cards; CPU contacts were separate boxes. No archive UUID is assigned to these environmental illustrations. |
| Wall interpretation | Eight basic-material textured planes, 768×1280 canvas maps; text/diagram/portrait flattened together, no physical backing or standoff. Existing 500px portraits already had light sepia treatment. |
| Archive models | Published catalog → UUID/category selection → existing nearest-row GLB budget and loader/cache → fitted cloned instance → Inspect. These contracts were already working and were not rewritten. |
| UI/audio | Large expanded desktop navigation panel by default. Howler toggle/channel registration exists, but no audio tracks are registered/bundled; this pass adds no sound or audio sources. |

**Floor investigation:** fixed-angle captures temporarily disabled the directional light, then the reflection. The sharp bright band through the start medallion disappeared without reflection; disabling the strong directional light also removed its strong highlight. It was a reflection/specular interaction involving the bright ceiling/frame geometry, rather than an extra object sitting on the floor. See `diagnostic-floor.png`, `diagnostic-no-directional.png` and `diagnostic-no-reflection.png`.

**Green end marker:** no authored pure-green portal square was found. CPU doorway frames/signage are already amber/dark; a CPU schematic or uploaded CPU can be visible through that opening. A soft amber doorway wash was added, without recoloring any uploaded material. The user's private CPU asset is not available in this fixture; an asset-colored green surface cannot be signed off or changed speculatively.

## What changed

- **Lighting/environment:** a locally generated Drei Environment with four inward-facing Lightformers, captured once per quality/context generation. Shared warm-white/amber reflections, with only a faint cyan fill. A capped pool supplies two nearby case spots on high / one on medium, two nearest Passage point lights, and two warm wall area lights outside low tier. Existing downlights are range-gated. No shadow-casting lights were added. Declared light count is now **16 high** (ambient + hemisphere + directional + six points + five spots + two areas), **15 medium**, and **11 mobile low**; not every declared light is active at every camera position.
- **Pipeline:** explicit sRGB output, ACES and exposure .95 only for connected museum rendering. Brand source tokens remain `#050505`, `#0D0D0D`, `#171717`, `#FF7A18`, `#FFB547`, `#55E6E6`; physical HDR highlights can approach warm white, while HUD orange remains the actual CSS token. Auth's non-connected scene and Landing renderer code are unchanged.
- **Materials/floor:** cached procedural stone, cloud/smudge roughness, stretched brushed microstructure and chip-marking maps. Color maps use sRGB; roughness/bump data stays linear, with mipmaps and bounded anisotropy. Warm graphite replaces cool pale architectural steel. Floor roughness variation, lower reflection contribution and much broader blur remove the captured hard streak; high uses 512px reflection, medium 256px, low none. Reflection retires outside the Entrance with a two-metre hysteresis band. The artifact-angle after capture no longer shows the original sharp gray/bright band; soft warm physical highlights are intentionally retained.
- **Grounding/atmosphere:** merged soft contact/AO decals under cases and at wall junctions; merged warm floor/wall pools match strips. Exponential warm-dark fog adds depth. Seven restrained faux cones are depth-tested and distance-faded; these are not full volumetrics or a depth-buffer intersection pass. One point cloud has 96/32/0 particles, constrained to those cone volumes. Motion pauses for reduced motion, hidden documents, atmosphere pause and Inspect.
- **Cases/prototypes:** shared reflective, tinted glass with a Fresnel-like alpha edge, no transmission pass. Thin illuminated lid edges replace the luminous full lids. Existing case/stand positions and dimensions stay fixed. Environmental studies rotate at approximately 14–18 seconds per revolution with staggered phases, a .004m idle movement and tiny tilt. Hover/read-only category focus turns them toward the camera; motion pauses in Inspect and stops outside the view/14m range. Reduced motion gives a static angle. Boards/cards/drives get inexpensive bevels and extra VRM/traces/platter grooves; PBR finishes separate PCB, marked chips, brushed metal and gold contacts. CPU contacts are merged. The terminal is fitted inside its unchanged enclosure during rotation.
- **Real models:** `UploadedExhibit`, GLTF fitting/cache, `CorridorExhibitions`, UUID selection and Inspect implementation were not changed. The optional detailed geometry flag defaults off for existing category previews. Published GLBs retain precedence over previews in their existing category showcases. Entrance studies remain explicitly **environmental prototypes**, not newly mapped archive exhibits or substitute CMS items.
- **Wall objects:** current content, EN/FA wording and world positions are retained. Beveled metal frames, backing/standoff, soft rear AO, satin prints, restrained reflective covers and top-weighted panel illumination add depth. Diagram ink is a slightly offset layer with one 1.1-second eased reveal when first seen, static under reduced motion. Existing portraits receive canvas-only warm duotone/vignette/grain. High-tier text textures are 2× the former dimensions; lower tiers reduce resolution. Fonts, locale and image readiness invalidate demand rendering; ordinary rerenders do not regenerate maps.
- **Postprocessing:** existing Three addons, not a new package. High uses a very low-strength HDR-threshold bloom (.11 / threshold 1.25), two-sample antialiasing where supported, and output color conversion. HDR Entrance inlays are the intended bloom source; ordinary prints remain below threshold. Very bright physical reflections may also pass this luminance threshold: this is **not** an extra object-mask bloom render. Medium/low use soft fake glow; the existing CSS vignette remains. No full-screen grain/AO pass or expensive transmission/SSR was added.
- **HUD:** primary tour/explore, arrows, skip and hall chips remain reachable in a slim bar. Collection/category/reload/restart/atmosphere controls move into the existing accessible disclosure, now closed by default. Explore walk controls remain outside the drawer. Same store actions/keyboard listener, localized Details label, focus-visible styles, RTL and ≥44px mobile control heights/targets. Gallery/Inspect entry remains intact.
- **Batching/ownership:** explicitly scoped static Passage boxes/inlays are merged by finish, with unchanged transforms. Animated bays, real models, CPU lessons and Entrance studies are excluded. Shared materials/geometries/maps have one disposal owner. Renderer context-loss status uses scoped listeners; restoration recaptures the generated environment without resetting visit/selection.

## Quality tiers

Selection considers DPR, cores, optional device memory, coarse pointer/narrow viewport and reduced motion. A sustained >24ms rolling average for about five seconds, following warmup, lowers quality one step. Individual loading stalls/hidden time are excluded. The tier never automatically increases within the session. Optional sessionStorage stores only the tier string; denied storage is tolerated.

| Setting | High | Medium | Low |
| --- | --- | --- | --- |
| Maximum DPR | 1.5 | 1.25 | 1 |
| Entrance reflection | 512, broad blur | 256, broad blur | None |
| Generated environment | 128 | 64 | 32 |
| Anisotropy cap | 8 | 4 | 2 |
| Inner case spots | 2 nearest | 1 nearest | 0; baked pools/IBL |
| Wall area lights | 2 | 2 | 0 |
| Dust | 96 | 32 | 0 |
| Postprocessing | HDR threshold bloom + output | None; fake glow | None; fake glow |
| Shadows | Baked-style AO/contact decals | Same | Same, no extra shadow render |

Reduced motion also disables study/orbital/dust/reveal movement and postprocessing. The watchdog and conservative tier selection have focused unit coverage; this is not a hardware certification for every browser/device.

## Measured renderer budgets

Actual browser frames, same camera poses and DPR 1, median of eight RAF samples with `renderer.info.autoReset=false` for each complete frame. Counts include reflection/postprocessing work, rather than only the final draw. Baseline and final fixtures use the same two published metadata records; private user GLBs are not used for these views.

| Tier / fixed view | Before calls | After calls | Change | Before triangles | After triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop high / Entrance | 578 | 506 | −12.5% | 31,419 | 42,073 |
| Desktop high / Passage | 339 | 149 | −56.0% | 10,665 | 6,014 |
| Mobile low / Entrance | 261 | 194 | −25.7% | 15,820 | 16,414 |
| Mobile low / Passage | 165 | 131 | −20.6% | 5,316 | 5,902 |

Both call budgets pass: high is below the original count, and low does not increase. High Entrance triangles increase with beveled studies/framing; merged static finishes can submit more off-axis triangles than individually culled boxes. Raw per-view materials, light totals, memory and samples are in the paired JSON files. Final fixed high views registered approximately 118 geometries/60 textures; low Entrance 80/22. Counts represent uploaded GPU resources, not byte-size estimates.

**60-second walking check:** low tier with the controlled real-model fixture, after entering/exiting Inspect, remained **105 geometries / 35 textures before and after** continuous forward/back movement through the existing controller. This tests retained-resource growth on that path, not every possible upload/route for unlimited time.

Short high-tier development-browser samples were roughly 24–34ms per frame depending on view/pass; low emulation samples were roughly 6–7ms. These are short RAF measurements on this Windows test host, not proof of 60fps on a mid-range desktop or 30fps on a physical phone. Sustained slow rendering is handled by the downgrade watchdog; physical-device performance acceptance remains open.

## Verification and preserved boundaries

| Command/check | Result |
| --- | --- |
| `npm run typecheck` | Passed; final builds also run `tsc -b`. |
| `npm run lint` | **Fails with the same two baseline errors** in untouched `src/features/landing/components/LandingIntro.tsx:291` and `:612` (`react-hooks/set-state-in-effect`). No suppressions or Landing edits. |
| Changed-file ESLint | Passed for 25 TS/TSX/test files, plus final touched-file checks. |
| `npm run build` | Passed. Final lazy lighting/LTC chunk 249.72 kB / 104.83 kB gzip is museum-only; PostFX wrapper chunk .74 kB / .44 kB gzip, with existing shared helpers. Initial JS 2,134.72 kB / 619.44 kB gzip. Existing large-chunk/ineffective service dynamic-import warnings remain. No package/lockfile change. |
| `npm run test:museum` | **11/11 passed**. |
| `node --test tests/museum-visual-quality.test.ts` | **7/7 passed**: tiers/watchdog and all five detailed hardware batches, including compatible merged attributes/bounds. |
| Focused museum browser cases | **4 distinct after cases passed**, serial Edge worker: fixed views/call budgets; mobile FA/RTL/details/targets; motion/Space/Inspect/camera return/60s memory/context recovery; final floor angle/frame sampling. Relevant cases were replayed after visual fixes, not a full regression suite. |
| Existing Landing browser case | **1/1 passed**: `navigation, reload midway, final keyboard CTA and route cleanup`, exercising scroll/monitor entry/login return and one Canvas. Other Landing scenarios were not replayed. |
| Protected-source comparison | **77 protected files checked, zero changes**: Landing, auth, services, Supabase, package files, camera controller/state/route/collision/store, uploaded GLB/Passage showcase, CPU Hall and CPU schematic implementation. |

The first detailed-geometry attempt mixed indexed and non-indexed shapes; it was corrected before acceptance and the dedicated geometry tests now cover every detailed variant. One mobile test initially used the wrong Persian accessible name; it now uses the existing `دسته‌ها` translation, with the same assertion intact. The final fixed-view test observed zero console errors/page exceptions. There was no warning suppression.

**Renderer warnings:** `THREE.Clock` deprecation and a WebGL shader link precision info log (`X4122`, tiny floating-point sums) remain visible. The **identical X4122 log was also reproduced on the unchanged Landing scene** during its passing check, along with Landing's existing PCFSoftShadowMap fallback warning. Therefore it is not classified as a new museum-only runtime failure, but this environment does not have a completely clean console. Its underlying driver/compiler cause was not established. See `after-warnings.json`.

## Screenshots

Actual PNGs, opened for visual review, are saved in [`visual-pass/`](visual-pass/). Camera poses are identical before/after; animated study phases are intentionally live, and the final close case uses hover to present its front. These are real rendered procedural studies, not the user's private GPU/RAM/CPU files.

| View | Before | After |
| --- | --- | --- |
| Entrance start | [before-entrance.png](visual-pass/before-entrance.png) | [after-entrance.png](visual-pass/after-entrance.png) |
| Storage / Motherboard | [before-hardware-panels.png](visual-pass/before-hardware-panels.png) | [after-hardware-panels.png](visual-pass/after-hardware-panels.png) |
| Ada / Turing | [before-portraits.png](visual-pass/before-portraits.png) | [after-portraits.png](visual-pass/after-portraits.png) |
| Passage → CPU | [before-passage.png](visual-pass/before-passage.png) | [after-passage.png](visual-pass/after-passage.png) |
| Close case | [before-case.png](visual-pass/before-case.png) | [after-case.png](visual-pass/after-case.png) |
| Mobile low FA | [before-mobile-fa.png](visual-pass/before-mobile-fa.png) | [after-mobile-fa.png](visual-pass/after-mobile-fa.png) |
| Floor artifact angle | [diagnostic-floor.png](visual-pass/diagnostic-floor.png) | [after-floor.png](visual-pass/after-floor.png) |

The open mobile drawer is separately captured in `after-mobile-details-fa.png`; it is deliberately allowed to cover more of the view while opened. Desktop/mobile screenshots, including frames, hardware, glass rims and the floor angle, were inspected. Mobile is touch emulation, not a physical phone.

## Files in this pass

- Rendering/quality: `src/experience/MuseumCanvas.tsx`, `MuseumScene.tsx`, `MuseumLighting.tsx`, `MuseumAtmosphere.tsx`, `MuseumPostFX.tsx`, `museumQuality.ts`, `useMuseumQuality.ts`.
- Shared surfaces/batching: `src/experience/MuseumResources.tsx`, `MuseumVisualResources.ts`, `museumSurfaceTextures.ts`, `architectureResources.ts`, `museumPalette.ts`, `MuseumPrimitives.tsx`, `StaticMuseumBatch.tsx`, `MuseumArchitecture.tsx`.
- Entrance presentation/prototypes: `src/experience/EntranceGallery.tsx`, `EntranceStoneFloor.tsx`, `EntrancePanels.tsx`, `EntranceArtifacts.tsx`, `EntranceStudy.tsx`, `hardwarePreviewGeometry.ts`.
- HUD/i18n: `src/features/museum/MuseumNavigationControls.tsx`, `src/features/museum/museumNavigation.css`, `src/i18n/locales/en/museum.json`, `src/i18n/locales/fa/museum.json` (only Details added).
- Tests: `tests/visual-realism.playwright.config.ts`, `tests/visual-realism.spec.ts`, `tests/museum-visual-quality.test.ts`.
- Documentation/evidence: this report, `docs/phase08/PHASE_08_PROGRESS.md`, and PNG/JSON files under `docs/museum/visual-pass/`. Earlier Phase 08B files/assets were preserved and continued, not recreated.

## Deliberately not done / approval boundary

**Camera workstream H was not implemented.** The hard constraint explicitly prohibits changing camera/navigation logic and says to stop that item if it needs such a change. Input damping/inertia, route easing, idle camera breathing and speed-linked FOV would touch the sole camera owner. They need separate explicit authorization; no second camera controller or additive camera writer was introduced.

No new halls/layout, CPU lesson/exploded/hotspot changes, archive mappings, backend/data/security work, audio files, new portrait assets, full-screen AO/volumetric solver or dependency was added. Real uploaded assets and the reported private CPU/green appearance remain separately unverified. Existing global lint errors, shared renderer warnings and physical-device FPS are the remaining acceptance limits; do not describe this as a warning-free/physical-hardware certification.

## Pass 2 — plaques, physical plates, case interaction and visual doors (2026-10-24)

### Audit and confirmed causes

- `EntranceStudy` explicitly reduced the selected/hovered study's rotation speed to **zero**, then continuously turned it toward the camera. It also lacked cursor and click handlers. This explains why the selected right-hand CPU stopped while other studies continued turning. Case glass was raycast-enabled; interception was a risk, but was not established as the primary cause.
- The previous plates already had physical frames, but combined separate transparent text/diagram surfaces with large, low captions. Captures showed **real mullion/glass occlusion**, as well as the fragile alpha composition. Correcting only render order would not remove a metal rail in front of a letter. The final opaque print places captions above that sight line and uses physical backing/standoff.
- The six Entrance objects are existing **environmental procedural prototypes**, separate from published catalog GLBs in category showcases/CPU Hall. They retain that identity and now have explicit prototype plaques. Selecting one resolves only an existing published UUID of its active category; it does not manufacture a record or send procedural geometry into Inspect.
- No separate pure-green gate square was found in the authored architecture. The opening could show the schematic or an uploaded model beyond it. The new gate is graphite/amber; original uploaded materials were not recolored. The private real CPU asset remains unverified.

### Implemented presentation

**Pedestal plaques:** six opaque, physically mounted plates on the inward pedestal face; shared beveled body geometry and frame finish, individually owned print textures/materials. Prints are 1536×640 with font-ready redraw, mipmaps and capped anisotropy. Each contains the existing concept title, localized hardware subtitle and an honest procedural-prototype tag. Final mounting uses a 2° approach angle with a small standoff. A browser geometry check proves every plaque is wholly outside the pedestal (`abs(x) < 5.61`) and outside the existing walking envelope (`abs(x) > 5.5`). A visual-review defect where a more angled plaque sank into its pedestal was corrected, including the Persian right-hand text edge.

**Framed hardware plates:** reused the portrait family's beveled frame, backing, wall standoff and existing wall-wash treatment. Chose **authored procedural 2D canvas illustrations** (CPU contacts, dual GPU fans, RAM chips, motherboard slots/traces, HDD platter/arm), rather than another WebGL render target. This avoids changing the renderer state, reflection pipeline or render-target ownership. Illustrations and captions share one opaque satin standard-material print, roughness .62; they are labeled “Educational illustration” in EN/FA. Image brightness reveals once over 1.1s, instantly under reduced motion; captions never fade through a glass sorting queue. Resolution is 1536×2560/high, 768×1280/medium and 512×853/low. Existing portrait image bytes/paths remain unchanged. Two rear side-wall plates reuse existing Processor/Graphics content.

**Selected case parity:** idle speed is eased to 72% for selection and 48% for hover, rather than zero. Selection or first hover gives a brief .8s facing adjustment, after which continuous rotation remains active. All six use the same cursor, amber edge feedback and published-category selection path. Phase, speed and temporary facing progress are frozen during Inspect, then resumed from the retained angle. Reduced motion stays static. Pure-visual case/portrait/CPU-fin glass has no raycast handler and renders after opaque surfaces.

**Doors:** main arch at z=2.7 and CPU gate at z=−19.35 have graphite leaves, seams, handles, amber edges and a fake floor light pool. They read camera position and existing guided-tour state without writing navigation. Open at <9m ahead; close only beyond 12m ahead; retain the target in between, and stay open once the visitor is beyond them. Three-second reversible interpolation uses cubic-bezier(.77,0,.175,1). A local minimum aperture and near-plane concealment clear a fast walk/skip/restore even before the animation finishes. Reduced motion renders both fully open and static. The CPU HALL label keeps its content, with an opaque amber-edged backing hung below the passage shutters: final review found and corrected a ceiling member obscuring its small subtitle. No colliders, routes, room dimensions, tour stops or camera commands were added. Audio was skipped: the existing Howler registry has no bundled/registered source.

**Polish and cost:** fog is neutral graphite (`#131515`, density .019); the broad amber wall pool is confined near the ceiling, with a less saturated fake cone. Existing HUD title gets a subtle graphite scrim, including RTL. Walk controls retain all original handlers but become a compact icon pair with tooltips/accessible names and 44px touch targets. Static CPU Hall architecture now uses the existing static batching helper; its animated pedestal explicitly stays outside the batch. Uploaded objects and educational geometry are not batched.

Owned print textures/materials, frame geometries and door pool materials have explicit disposal; the shared owner disposes plaque geometry. No new WebGL render target or second WebGL Canvas is created. Render-target disposal testing for a new offscreen studio pass is therefore not applicable. The existing floor/FX owners are unchanged.

### Measured renderer cost

Fixed poses, serial Edge browser, same local blocked-network fixture before/after; whole-frame eight-sample median includes the reflection/FX passes. Raw light/material/memory samples are in `visual-pass/pass2/{before,after}-{high,low}.json`.

| Tier / view | Calls before | Calls after | Change | Triangles before | Triangles after |
| --- | ---: | ---: | ---: | ---: | ---: |
| High / Entrance | 511 | 395 | −22.7% | 42,083 | 43,679 |
| High / Passage | 149 | 93 | −37.6% | 6,014 | 6,256 |
| Low / Entrance | 194 | 142 | −26.8% | 16,414 | 16,800 |
| Low / Passage | 131 | 77 | −41.2% | 5,902 | 6,158 |

Both draw-call limits pass. Small triangle increases come from the plaque bevels, doors and static batch submission. Declared light counts are unchanged. Final Passage samples include the corrected label/border and the gate retained open after approaching/receding. Short final RAF samples were about **48.5ms/high Entrance, 45.3ms/high Passage, 6.7ms/low Entrance and 19.2ms/low Passage** on this host. The final Passage low sample follows a high-to-low quality switch. Several frame-time samples were slower than baseline despite fewer draw calls; these checks do **not** certify a frame-rate improvement or physical-device FPS. The existing quality downgrade mechanism remains in place.

After warming both ends of the walking path, **60 seconds and six door target changes retained exactly 124 geometries / 34 textures before and after**. The first unwarmed run added two frame geometries/textures on first viewing the newly added rear plates; repeating crossings after first visibility did not grow retained resources. This is a bounded path check, not unlimited-duration memory certification. See `visual-pass/pass2/walking-memory.json`.

### Verification results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed; final production build also completed `tsc -b`. |
| `npm run lint` | Final run fails only on the two pre-existing protected `LandingIntro.tsx:291,612` set-state-in-effect errors. New resource-mutation lint errors were corrected, without suppression. |
| Changed-file ESLint | All 17 changed/new TS/TSX/test files passed. |
| `npm run build` | Passed, including the final build after the visually confirmed gate-label correction. Initial JS 2,146.08kB / 622.91kB gzip. Existing large-chunk and ineffective service dynamic-import warnings remain. No dependency change. |
| `npm run test:museum` | **11/11 passed**. |
| `node --test tests/visual-pass2.test.ts` | **2/2 passed**: hysteresis and bounded monotonic/end-eased interpolation. |
| Focused browser checks | **7 distinct after scenarios passed across serial focused runs**, plus the two before-view cases. No full browser regression suite. |
| Preservation snapshot | **173 existing files compared; 161 unchanged, 12 expected visual/HUD/i18n files changed.** New files are limited to four visual helpers/components and four focused test files. See `visual-pass/pass2/preservation.json`. |

The seven browser scenarios cover: (1) fixed high views and call budget; (2) low/mobile FA/RTL view, overflow and budget; (3) all six plaque bodies outside the pedestal/walking envelope plus EN/FA close capture; (4) actual raycast hover/click on every case, exact published UUID, nonzero selected rotation, controlled real GLB Inspect freeze, per-frame phase continuity and previous camera restoration; (5) closed/mid/open arch, closed/open gate, held Walk input through the moving doorway, camera/leaf clearance, complete guided tour and reduced motion; (6) 60-second walking/resource stability and repeated door thresholds; (7) corrected gate label at both affected corridor views and final Passage budgets. Fixed high views observed zero console errors/page exceptions; the walking case also observed zero page exceptions.

Test-harness corrections were kept separate from product fixes: an aggregate post-Inspect angle assertion counted legitimate elapsed rotation, so it was replaced with a stricter per-frame continuity measurement; high-tier host timing caused a tour deadline/restore timeout, so behavioral cases use the existing low tier and allow up to 12s for pose preparation. The full tour still must reach >.99 progress, all six cases must select their exact UUID, and resource counts must match exactly. No production navigation logic was changed to satisfy tests.

Renderer warnings remain visible: the existing `THREE.Clock` deprecation and driver/compiler X4122 precision info log. No warnings were suppressed. Mobile is touch emulation; private hardware GLBs were not used. Both the hardware-print letter clipping and the separately discovered gate-subtitle occlusion were corrected in the reviewed views.

### Screenshot evidence

Actual rendered PNGs were opened for review; they show procedural environmental studies and authored illustrations, not private product photographs or CMS asset acceptance. All files are in [`visual-pass/pass2/`](visual-pass/pass2/).

| View | Before | After |
| --- | --- | --- |
| Entrance | [before](visual-pass/pass2/before-entrance.png) | [after](visual-pass/pass2/after-entrance.png) |
| Pedestal plaque | [before](visual-pass/pass2/before-plaque.png) | [EN](visual-pass/pass2/after-plaque.png), [FA](visual-pass/pass2/after-plaque-fa.png) |
| Selected CPU case | [before](visual-pass/pass2/before-selected-cpu.png) | [after](visual-pass/pass2/after-selected-cpu.png) |
| Processor plate | [before](visual-pass/pass2/before-processor-plate.png) | [after](visual-pass/pass2/after-processor-plate.png) |
| Graphics plate | [before](visual-pass/pass2/before-gpu-plate.png) | [after](visual-pass/pass2/after-gpu-plate.png) |
| Memory plate | [before](visual-pass/pass2/before-memory-plate.png) | [after](visual-pass/pass2/after-memory-plate.png) |
| Motherboard plate | [before](visual-pass/pass2/before-motherboard-plate.png) | [after](visual-pass/pass2/after-motherboard-plate.png) |
| Storage plate | [before](visual-pass/pass2/before-storage-plate.png) | [after](visual-pass/pass2/after-storage-plate.png) |
| Arch | [before](visual-pass/pass2/before-arch.png) | [closed](visual-pass/pass2/after-arch-closed.png), [mid](visual-pass/pass2/after-arch-mid.png), [open](visual-pass/pass2/after-arch-open.png) |
| Passage/gate | [before](visual-pass/pass2/before-passage.png) | [closed](visual-pass/pass2/after-gate-closed.png), [open](visual-pass/pass2/after-gate-open.png) |
| Mobile FA / low | [before](visual-pass/pass2/before-mobile-fa.png) | [after](visual-pass/pass2/after-mobile-fa.png) |
| Reduced motion | — | [static open](visual-pass/pass2/after-reduced-motion.png) |

### Files and preserved boundaries

- New visual components/helpers: `src/experience/MuseumPlaque.tsx`, `museumPlateIllustration.ts`, `MuseumDoors.tsx`, `visualDoorState.ts`.
- Updated visual components/resources: `EntranceGallery.tsx`, `EntrancePanels.tsx`, `EntranceStudy.tsx`, `MuseumVisualResources.ts`, `MuseumArchitecture.tsx`, `CPUHall.tsx` (static batching/glass/gate label only), `MuseumScene.tsx` (connected fog only), `MuseumAtmosphere.tsx`.
- HUD/localization: `src/features/museum/MuseumNavigationControls.tsx` (Walk markup only), `museumNavigation.css`, `src/i18n/locales/{en,fa}/museum.json`.
- Focused evidence: `tests/visual-pass2.{spec,test}.ts`, `visual-pass2.helpers.ts`, `visual-pass2.playwright.config.ts`, this report and `visual-pass/pass2/` PNG/JSON files.

The mission-start hash snapshot includes the previously unfinished work; it was preserved rather than reset. Landing/Hero/GSAP/monitor entry, sole camera controller, navigation state/routes/collision, persistence, museum store, published GLB loader/presentation/Inspect, CPU lessons, CMS, Auth, services, Supabase source/config/migrations, role contracts, package files and portrait bytes are unchanged in this pass. Existing Admin runtime/account work was not touched or exercised. Browser fixtures block external requests and use a synthetic catalog; no database, account, schema or security operation was performed.

No scope-expanding decision needs approval. Audio was intentionally skipped, and acceptance of the private CPU asset, physical-device frame rate and global Landing lint failures remains separate. This completes the requested visual pass; no new hall, camera, backend or further redesign work was started.


## Pass 4 — performance, readable bays and mobile (2026-10-26)

### Cost isolation — measured first

1080p Chrome/ANGLE, Intel UHD Graphics (0x0000A7A8), Windows D3D11. These are browser/R3F frame intervals, not GPU timer-query durations or physical-device certification. Sequential ablations are noisy and non-additive: baseline mean shifted from 20.74 ms in the first scenario run to 34.96 ms in the isolation run on this shared host. Initial Auto samples are retained, not discarded.

| Initial high isolation | Mean ms | Delta ms | p95 ms |
| --- | ---: | ---: | ---: |
| Baseline | 34.96 | 0.00 | 50.80 |
| Postprocessing off / direct render | 32.52 | -2.44 | 48.40 |
| Reflector off | 24.69 | -10.27 | 45.50 |
| RectAreaLights off | 30.87 | -4.09 | 47.70 |
| Point/spot lights off | 26.49 | -8.47 | 31.90 |
| Atmosphere filter off (also hid reflector; confounded) | 21.45 | -13.51 | 34.40 |
| Plate/plaque dimensions halved | 31.28 | -3.68 | 42.50 |
| DPR 1 (baseline already 1) | 34.50 | -0.46 | 56.70 |
| Contact AO decals off | 34.82 | -0.14 | 61.50 |
| IBL off (not a live capture) | 33.04 | -1.92 | 65.00 |
| HUD reports frozen | 32.76 | -2.20 | 49.20 |

The original atmosphere filter also matched the reflector shader: its saving is **not** attributed to cones/dust alone. A later correctly scoped whole-atmosphere removal measured 21.98 → 17.77 ms. Lambert walls measured 21.98 → 21.44 ms, with essentially identical p95 (26.20 / 26.20); PBR was retained. DPR 1 was a no-op/noise reference, not evidence of a resolution saving. Environment already used frames=1, so ongoing capture was absent; its measured row removes IBL shading instead. No shadow-map pass was enabled; the AO row disables authored contact decals. Four HUD commits per thirty seconds did not justify a camera rewrite. Raw data: before-isolation.json and remaining-isolation.json.

### Before/after frame results

Final High ran serially without a concurrent build/lint command from this mission. Each fixed view sampled ~3.5 s; walk sampled 30 s. Program/light figures are actual renderer observations.

| Scenario | Before mean / p95 / p99 ms | Final mean / p95 / p99 ms | Before >33 / >50 | Final >33 / >50 | Calls final | Programs / lights | DPR / tier |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| Entrance High | 20.74 / 23.70 / 27.00 | 11.70 / 14.70 / 18.50 | 0 / 0 | 0 / 0 | 201 | 38 / 2 | 1.00 / high |
| Passage start High | 16.95 / 21.00 / 22.40 | 10.29 / 11.80 / 17.80 | 0 / 0 | 0 / 0 | 104 | 38 / 2 | 1.00 / high |
| CPU arrival High | 18.85 / 22.60 / 25.10 | 10.81 / 12.90 / 14.50 | 1 / 1 | 0 / 0 | 54 | 38 / 2 | 1.00 / high |
| 30 s walk High | 18.97 / 22.40 / 24.50 | 11.40 / 16.10 / 22.60 | 2 / 2 | 2 / 0 | 54 (end) | 38 / 2 | 1.00 / high |
| 30 s walk Auto | not recorded | 27.46 / 48.40 / 76.80 | — | 238 / 50 | 53 (end) | 38 / 2 | 0.70 / high |
| Guided route 30 s window | not recorded | 9.43 / 14.80 / 18.30 | — | 0 / 0 | 54 (end) | 38 / 2 | 1.00 / high |
| Warm repeated 60 s walk | not recorded | percentiles not retained | — | 0 / 0 | varies | 38 / 2 | 1.00 / high |

Baseline programs/lights were 53/16. The first baseline probe counted only the final compositor draw (1), so matched baseline whole-frame calls are **unavailable**, not reported as one draw. Historical Pass 2 references (395 Entrance / 93 Passage high whole-frame calls) are separate measurements. Final calls count the whole direct frame; moving-window values are its endpoint, not an invented median. The guided window includes final idle after arrival. Samples start after load/pose warmup.

**Strict performance decision: NOT fully accepted on this test host.** Clean fixed High meets the p95 target in the measured views and walk (16.10 ms), but the thirty-second walk still had two >33 ms frames. Warm sixty-second walking and the guided window had no >33/50 ms frames. Final Auto remains over target even at its DPR floor; earlier samples are retained in after-auto-initial-scenarios.json and after-auto-before-resource-retention.json. Residual timing cannot yet separate integrated-GPU fill/driver cost from shared-host frame scheduling: the composer and live reflection render are absent, architecture lighting stays at two, walking programs remain constant, and simpler walls did not buy reliable p95 headroom. RAF intervals do not prove a precise residual CPU/GPU split; that requires an owner-machine trace/GPU capture. Further resolution reduction would breach the selected sharpness floor. Do not certify mid-range/physical-device 60fps from these variable shared-host runs.


### Diagnosis and rendering policy

- The full-screen high composer rendered at 0.85 × CSS resolution without samples, replacing native MSAA. Its removal restores direct ACES/sRGB rendering with native AA on desktop **and mobile**. Ordinary emissive strips are no longer multiplied by 3.8; existing shared gradient pools supply the soft glow. No new composer, dependency or second Canvas was introduced.
- All tiers now retain the **same two real lights**: ambient and hemisphere. Their intensity/exposure interpolates with the existing zone calculation. Local point/spot/area lights were removed from Entrance/CPU architecture, so neither hall entry nor quality selection adds/removes lights. The one-frame lightformer environment remains an IBL source, not an ongoing scene capture. Particle geometry/materials remain mounted while draw range/visibility hides dust, preventing shader disposal/recompile on Auto recovery. The final fixed-tier walking test records actual program/light counts, rather than treating draw-call reduction as proof of GPU speed.
- High/medium floor reflection is a **single static-architecture planar bake** at 512/256 px, using the existing Reflector projection, a fixed capture view and an explicit static/emissive layer. It excludes studies, moving doors/glass and uploaded GLBs; subsequent movement performs no scene reflection render. Low has no reflector. A small multi-tap filter, low blend, stone roughness and contact shading keep the result soft. The static bake deliberately does not track moving exhibits or perspective-correct parallax from every visitor position. Targets/geometries are disposed on tier/context changes and unmount.
- The remaining Passage hitch was not explained by a changing light/program count: profiling found that a location report rerendered the Canvas subtree and re-created both static merged batches. A short controlled Passage crossing changed both batch-build counters **2 → 3**, with three >50 ms frames (max 88.8 ms). Memoizing the existing Scene/Architecture boundary and selecting only the computed architecture end removed that work: counters **1 → 1**, no >50 ms frame in that focused crossing, average 24.27 → 19.57 ms and p95 44.7 → 27.4 ms. This addresses a confirmed rebuild source; it does not establish that every hitch on the host is eliminated.
- Canvas JSX is retained across HUD/location changes so it cannot overwrite the adaptive DPR and allocate the drawing buffer twice. Static resources/hero maps also survive tier changes. Mounted textures are initialized in small entry slices, followed by compileAsync and an 8×8 offscreen buffer warmup with temporarily disabled frustum culling. The real visitor camera, paths, scene transforms and navigation state are never changed by preparation; all renderer/culling state is restored and the temporary target is disposed. Only already mounted resources are prepared; no extra model URL is fetched.
- A separate Lambert wall experiment saved only ~0.54 ms with effectively unchanged p95 (26.2 ms) on this variable host and changed the shading. It was **not retained**. Hero PBR and the existing architectural material family remain. The large transparent cones were removed after the remaining-atmosphere experiment; shared contact shading/pools remain and dust is capped at 12/6/0.

### Auto quality, diagnostics and ownership

Open the development museum with `?debug=perf`. The diagnostic overlay updates twice per second and exports copyable JSON via its button or `window.__corePerf.dump()`: last-five-second FPS/mean/p95/p99, frame counts, actual DPR/tier/reason, calls/triangles/geometries/textures/programs, real light count, GPU renderer, direct/postprocessing state, baked reflection capture count and bounded hitch/change history. Hitch timestamps use performance.timeOrigin + at, with camera position and hall. The probe counts the **whole previous frame**, not only the final compositor triangle. It restores renderer.info.autoReset on unmount. Without the query it is inert; production builds make it inert even with the query.

`?quality=auto|high|medium|low` sets initial preference, with explicit tiers fixed. Details contains localized Quality and Brightness controls. Preferences persist in localStorage under dedicated non-secret keys, with reads/writes protected by try/catch; old session-only downgrade locks are not imported. URL preference wins on the next reload; an in-app choice applies immediately.

Auto uses rolling sustained-cost windows: wait for resource preparation and then ignore the first three seconds, two seconds after hall/intent changes, hidden time and individual >50 ms stalls; a stall is discarded without erasing otherwise sustained overrun. Above 17.5 ms average, reduce DPR by 0.06 steps before dust/pool budgets and then tier. Six seconds below 17.1 ms allows tier/effect/DPR recovery (DPR +0.03), with cooldown/hysteresis. Desktop DPR ranges from 0.7 × its capped value to its capped native resolution; high/medium/low pixel budgets are 2.5/1.9/1.25 million. Mobile aims at 1.5 with a 1.25 floor where the pixel budget permits. A fixed choice disables automatic changes. Changing tier preserves current resolution within its new limits instead of immediately jumping back to maximum.

The sole camera controller already uses delta-time damping/steps. Measured HUD commits were four per thirty seconds, so **the authorized camera-controller diff is empty**. No input mapping, collision, tour, Inspect return state or CPU lesson logic was changed.

### Brightness, bay/content and visual corrections

- Standard is brighter: readable graphite albedo/floor, stronger neutral fill/IBL, restrained zone exposure. Dim/Standard/Bright smoothly scale exposure/fill (or apply on an explicitly invalidated reduced-motion demand frame) without recreating lights or scene resources. Screenshot luminance uses encoded sRGB weighted luma, with the diagnostic panel hidden; it is not calibrated physical luminance. See the measured table below and raw luminance.json.
- `entranceBayMap.ts` gives each of the six unchanged cases a same-z wall slot: terminal/Personal computing, CPU/instruction cycle, GPU/parallel work, memory/DRAM addressing, motherboard/system paths, storage/storage timeline. Two distinct surplus drawings occupy rear slots: memory history on the left and CPU history on the right. No duplicate drawing occurs on either wall. Frames, case positions, wall dimensions and the walking envelope remain. Prints retain 1536×2560 source resolution in every tier, and plaques remain 1536×640; effects are reduced before hero texture sharpness. All retain their EN/FA Educational illustration/prototype tags. **Every printed factual statement, label and milestone in both languages is transcribed in [plate-content.json](visual-pass/pass4/plate-content.json); the readable owner checklist is [plate-facts.md](visual-pass/pass4/plate-facts.md).** No new historical dates/numbers were invented.
- The original poster frame/headline/tagline remain. Its new 01 / Orientation eyebrow avoids the HUD duplicate. The top-down line spine names Entrance/Passage/CPU Hall and four dashed Coming soon halls. A separate amber marker reads the current hall without rerendering or uploading the poster texture on entry.
- Door leaves overlap by 0.06 m and carry a graphite meeting strip. The floor seam pool is zero when closed. Existing open/close hysteresis, three-second easing, reduced motion and near-camera concealment remain. Closed/mid/open captures and geometric overlap/clearance checks distinguish a sealed surface from an emissive hairline. The portal-facing circular pool and cones are gone. CPU backing surfaces are rougher to remove the specular spot. The already-raised halo is clear of THE PROCESSOR in the captured views; ring/layout transforms were preserved.
- Only **procedural CPU materials** changed: desaturated graphite substrate and a rougher, less metallic label surface. No uploaded/published GLB was recolored, resized or split.
- Mobile has the existing top bar, one compact bottom dock, a separate contextual action row above it, a card below the title, safe areas and 44 px targets/12 px effective HUD text. Details holds display/collection tools. The duplicate floating Assembly link is hidden on small screens while its existing Details destination remains accessible. Its route/business logic is not changed.

### Verification, preservation and limitations

- **27 native tests passed:** npm run test:museum (11), plus 16 quality/door/geometry/policy tests including seven new Auto/bay cases.
- **11 distinct browser scenarios passed across serial focused invocations:** scenario measurement; visual/content/door/preferences; sixty-second invariants and tour; mobile EN/FA at two sizes; material/atmosphere isolation; batch profiling; all six raycast/rotation/selection/Inspect interactions; safe doorway/reduced-motion/CPU lessons; diagnostic portal/exact crops/storage denial; retained particle programs; reduced-motion brightness invalidation. Diagnostics are included; retries and viewport variants are not extra cases. One six-case check was interrupted by navigation while concurrent source work was present; only that case was rerun and passed with unchanged assertions. Final cases passed across focused runs, not one unrelated full regression matrix.
- Final typecheck, production build, changed-file ESLint (zero warnings/errors) and diff checks pass. Existing bundle-size/service-import warnings remain. Full lint retains **seven unchanged errors**: LandingIntro.tsx:291,612 (protected set-state-in-effect); useIntroState.ts:26 (no-empty); draftStorage.ts:19,29,38,50 (no-empty). No suppression or unrelated refactor was applied. Early Assembly failures were outside this mission and were subsequently corrected by concurrent work.
- Retained resources after sixty seconds: **124 geometries / 40 textures → 124 / 40**; programs/lights remain **38/2**. HUD commits: 4 per 30 s; 16 across the sixty-second alternating route (discrete checkpoint changes). This is a bounded warm-path check. Particle budget changes preserve geometry/material UUIDs and program count.

| Default screenshot | Mean encoded luma | Pixels below 5% |
| --- | ---: | ---: |
| entrance | 10.20% | 14.64% |
| passage-start | 8.39% | 24.66% |
| passage-mid | 9.83% | 17.01% |
| passage-end | 11.03% | 9.21% |
| cpu | 9.71% | 16.79% |

Passage means are 82.2%, 96.3% and 108.1% of Entrance. All measured defaults stay below 50% near-black pixels. Bright/Dim mean luma: 12.60% / 8.26%. This uses screenshot encoded-sRGB weighted luma, not calibrated physical luminance.

Mobile context/dock/card rectangles do not intersect; canvas AA is enabled and DPR is at least 1.25 at 380×776 and 390×844. These are emulated devices. The preserved 3D educational plaque can crop at close portrait framing; changing showcase geometry/projection is outside the protected presentation boundary.

Evidence in [pass4/](visual-pass/pass4/): Entrance, left/right wall, orientation poster; door closed/mid/open; Passage start/mid/end; CPU; EN/FA 380/390; reduced motion; overlays per tier; raw metrics/content. Aliasing crops are exact 220×240 pixel extracts, without resampling (aliasing-crops.json), not regenerated artwork. Rendered PNGs were opened for review.


All browser checks use intercepted local fixtures and synthetic frontend authentication, with external requests blocked. No real account, catalog row, Storage upload, backend/RLS, credential or deployment operation was performed. Physical-device keyboard/GPU performance, real private GLBs and production timing are not certified. Native MSAA reduces aliasing; finite pixel budgets do not guarantee mathematically alias-free subpixel lines at every distance.

The matched current-run before captures cover Entrance/Passage/CPU performance poses. Other before references are explicitly historical Pass 3/Pass 2 captures; they are not relabeled as new matched measurements. The first combined baseline diagnosis was interrupted by a separate source reload; its saved scenarios were retained and its isolation portion rerun separately. Tests were corrected to issue held-move input only when direction changes, rather than emitting a synthetic store write every frame. Repeats, viewport variants, diagnostics and interrupted runs are not counted as additional acceptance scenarios.

The mission-start hashes preserve pre-existing work. Concurrent external edits to router/i18n/Assembly/build configuration were observed during this task and are **not** Pass 4 changes. Initial unrelated Assembly type/lint failures were subsequently corrected externally; no credit is taken here. Landing/Hero/monitor source, camera/controller, routes/state/collision, uploaded model pipeline, Auth/CMS/services, Supabase source/migrations and package files were not edited by this mission. Detailed preservation results and file inventory are recorded below.

No scope expansion or privileged action awaits approval. The strict performance target remains the measured acceptance decision above, not an unconditional claim of 60fps. Stop after this museum pass.

### Pass 4 file inventory and preservation audit

- Rendering/quality/lighting: MuseumCanvas.tsx, MuseumScene.tsx, MuseumLighting.tsx, MuseumAtmosphere.tsx, MuseumRenderPreparation.tsx, MuseumResources.tsx, EntranceStoneFloor.tsx, museumQuality.ts, useMuseumQuality.ts, museumPalette.ts. New: MuseumAdaptive.tsx, museumAdaptivePolicy.ts, MuseumPerf.tsx, museumPerfData.ts, MuseumPreferences.tsx.
- Architecture/content: MuseumArchitecture.tsx, StaticMuseumBatch.tsx, EntranceGallery.tsx, EntrancePanels.tsx, EntranceArtifacts.tsx, MuseumDoors.tsx, PassageLighting.tsx, CPUHall.tsx, CPUSchematic.tsx (materials only), museumStoryDrawing.ts. New: entranceBayMap.ts, museumOrientation.ts.
- HUD/localization: src/features/museum/MuseumNavigationControls.tsx, museumNavigation.css; en/fa museum.json.
- Tests: tests/visual-pass4.spec.ts, visual-pass4.test.ts, visual-pass4.playwright.config.ts. Documentation/evidence: this appended section and visual-pass/pass4/. Full relative paths: [files-changed.json](visual-pass/pass4/files-changed.json).
- Early hash snapshot (after attaching the initial diagnostic probe): 197 files, 162 unchanged. 25 expected existing-source differences; 10 concurrent external-source differences, enumerated in [preservation.json](visual-pass/pass4/preservation.json). New source files are listed separately; initial user edits were never reset. Camera controller, package files and all snapshotted Supabase source/config/migrations are byte-identical. External router/i18n/Assembly work was not reverted or credited to this pass. No source was committed or deployed.

Tier workload evidence (overlay snapshots, not stabilized FPS benchmarks): high Entrance renders about 24,026 triangles at DPR 1; low renders about 19,682 at DPR 0.776 (roughly 40% fewer drawing-buffer pixels), hides dust/pools as budgeted and has no reflection texture. Both keep two real lights, native AA and sharp hero print sources. Renderer program counts after changing tiers can include cached environment/reflection variants; the strict constant-count assertion applies to walking within the selected tier, and a separate test checks Auto atmosphere hide/recovery without shader/resource disposal.

### Complete printed plate statements for owner verification

EN text below; the matching Persian source is included in [plate-content.json](plate-content.json). The conceptual drawings do not claim exact core counts, capacities or manufacturing dimensions.

- **Personal computing**: A keyboard enters information. A screen displays the result. Labels: Screen and keyboard; Tools for individual work.
- **The instruction cycle**: Fetch, decode, execute, repeat. A conceptual processor cycle. Labels: 01 / Fetch; 02 / Decode; 03 / Execute; Registers; ALU; Cache.
- **Work in parallel**: Many cores share independent work. Conceptual layout; counts vary. Labels: 01 / CPU cores; 02 / GPU cores; 03 / Parallel work.
- **Addressing a bit**: A DRAM cell stores charge. Stored charge needs refreshing. Labels: 01 / Rows; 02 / Columns; 03 / Transistor + capacitor; 04 / Data path.
- **Paths through a system**: Buses carry data between parts. Power follows its own paths. Labels: 01 / Socket; 02 / Memory; 03 / Expansion; 04 / Storage; 05 / Power.
- **Keeping information**: From magnetic media to flash. Different ways to retain data. Labels: none. Milestones: 1956 — IBM RAMAC: Random-access disk storage; 1971 — Floppy disk drives: IBM begins selling drives; Later — Flash-based SSDs: NAND cells; no moving parts.
- **Memory changes form**: Three approaches to working memory. A timeline of ideas, not to scale. Labels: none. Milestones: 01 — Magnetic core: Bits as magnetic states; 02 — DRAM: Charge in memory cells; 03 — SDRAM: Transfers follow a clock.
- **Instructions find a home**: Three processor milestones. Programmable work, on a chip. Labels: none. Milestones: 1971 — Intel 4004: A programmable microprocessor; 1978 — Intel 8086: The x86 family begins; 1989 — Intel486: Cache joins the processor.

Unchanged portraits: Ada Lovelace, 1843 / Beyond calculation, Notes on the Analytical Engine; Alan Turing, 1936 / The universal machine, Foundations of computing. Their original portraits and captions were preserved. The orientation poster names Entrance, Passage and CPU Hall; GPU, Memory, Storage and Motherboard are explicitly marked Coming soon.
