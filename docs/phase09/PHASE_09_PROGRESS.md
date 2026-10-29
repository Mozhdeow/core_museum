# CORE — Phase 09 Progress

Latest provider work: see **OpenCode integration — 2026-10-28** at the end. Earlier Phase 09B mock-only statements below are retained as historical records and are superseded by that integration entry.

## Phase 09A — Interactive PC Assembly Lab — 2026-10-26

**Implemented and accepted in the focused checks below. Stop before Phase 09B.** Continued the existing working tree; no reset, migration, account operation, dependency installation or private museum GLB was used. Read the Phase 07 architecture and latest Phase 08 progress before adding the isolated Lab.

### Visitor experience

- Protected `/museum/assembly`, accessible from the Entrance and the museum's Details controls. On narrow screens the existing compact Details dock retains the destination. Entry fades in; the return link fades out unless reduced motion is requested. Returning uses the existing saved museum visit and camera owner.
- A graphite/amber workstation with an open-frame case, removable transparent side panel, motherboard tray and standoffs, PSU cover with cable-routing apertures, hardware tray, external monitor, physical power button and status indicator. Geometry is procedural and locally owned.
- Eleven selectable parts: motherboard, CPU, cooler, two interchangeable DDR4 modules, GPU, SATA SSD, PSU, front/rear fans and monitor. Gold socket/CPU alignment marks, four physical DIMM slots with A2/B2 installation targets, PCIe contacts, rear outputs and visible connector blocks explain the reference layout.
- Actual pointer-captured 3D part dragging with ray-tested installation targets, invalid-drop recovery and smooth snap animation. Select-part/choose-target buttons provide keyboard and touch access; HTML tray dragging also works. Selecting the next recommended part never installs it automatically.
- Guided and free modes, localized component descriptions and placement hints, progress, reversible removal/reinstallation and restart. Occupied targets, missing prerequisites, closed panels, connected cables and powered-on changes are rejected with an explanation.
- Eleven explicit cable connections: 24-pin ATX, CPU EPS, GPU auxiliary power, SATA data, SATA power, display, PC AC, monitor AC and three fan leads. Both matching endpoints and installed prerequisites are required. Fixed rendered cable routes alone never mark a connection as complete. Labelled endpoint buttons support accessible connection; 3D endpoint dragging and HTML cable dropping are additional input paths.
- Power-on validates every required part's target/dependencies and every required cable. Failed checks list actionable missing items; selecting a diagnostic focuses the corresponding component context. A complete build starts its fans/indicator and monitor startup, then shows **Welcome to CORE** and **Assembly Completed Successfully**. Hardware changes require power off. Reload restores the build with power off.
- Full horizontal orbit, wheel/pinch zoom, top/back, left/right, reset, individual part focus and return-to-view. Camera commands travel along an orbital arc rather than a straight line through the case. Camera/drag bounds keep interaction above the bench and outside the case shell. The Lab has its own controller only while the museum controller is unmounted.

### Reference configuration and presentation corrections

The fixed educational configuration is mATX / AM4 / DDR4 / PCIe discrete GPU / 2.5-inch SATA SSD / ATX PSU. Connector families and A2/B2 usage were checked against the [official ASUS AM4 motherboard manual](https://dlcdnets.asus.com/pub/ASUS/mb/SocketAM4/PRIME_B450M-A_II/E17196_PRIME_B450M-A_II_UM_WEB.pdf). This is original conceptual geometry, not an exact ASUS replica or a compatibility guarantee for arbitrary commercial parts. One scene unit represents approximately 10 cm.

Visual review corrected RAM insertion orientation, opaque fan backs, the PSU fan's relationship to the cover, the motherboard's rear alignment/standoffs, the GPU display socket/cable gap, and SSD support. Cable apertures keep the cover visibly continuous without forcing the internal leads through a solid slab. Monitor focus now faces its screen without the case hiding the welcome text. Selection uses a clean edge outline without a diagonal across the monitor; installed parts no longer offer redundant installation buttons. Only the selected uninstalled part has visible valid-target outlines.

### Architecture, storage and resource ownership

| Responsibility | Files |
| --- | --- |
| Parts, mounts, ports, cable routes, reference identity | `src/features/assembly/assemblyDefinition.ts` |
| Pure placement/removal/connection/boot/snapshot validation | `src/features/assembly/assemblyRules.ts` |
| Independent Zustand assembly state and commands | `src/features/assembly/assemblyStore.ts` |
| Versioned, owner-scoped snapshot validation | `src/features/assembly/assemblyPersistence.ts` |
| Pooled procedural hardware, case, outlines and resource disposal | `src/features/assembly/AssemblyHardware.tsx` |
| Workstation rendering, real drag/drop, target hit tests, cables and monitor texture | `src/features/assembly/AssemblyScene.tsx` |
| Lab-only orbit, focus/return, camera commands and limits | `src/features/assembly/AssemblyCamera.tsx` |
| Guidance, inventory, diagnostics, accessible controls, persistence lifecycle | `src/features/assembly/AssemblyLab.tsx`, `assembly.css` |
| Lazy protected route | `src/features/assembly/AssemblyRoute.tsx`, `src/app/router/index.tsx` |
| Museum entry links | `src/features/museum/MuseumNavigationControls.tsx`, `museumNavigation.css` |
| EN/FA resources | `src/i18n/locales/en/assembly.json`, `src/i18n/locales/fa/assembly.json`, `src/i18n/index.ts` |
| Focused verification | `tests/assembly.test.ts`, `tests/assembly.spec.ts`, `tests/assembly.playwright.config.ts` |

Snapshots use `core-assembly:<account UUID>`, version 1, reference ID and a 30-day maximum age. Only installed part/slot IDs, connected cable IDs, mode and panel state are persisted. Unknown identities, occupied slots, missing dependencies, dangling connections, wrong owners, incompatible versions/references and malformed snapshots are rejected. Credentials, upload files and powered-on state are not persisted. Storage denial is optional and does not prevent assembly. Cleanup saves progress and releases account state.

The Lab and its scene are lazy chunks. There is one active Canvas, pooled primitive geometries/materials, merged pin/fan-frame geometry, a single merged cover with apertures, limited local lighting and no shadow-map, reflection, transmission or post-processing passes. DPR is capped at 1.25 desktop / 1 mobile. Reduced motion uses demand rendering, immediate placement/camera transitions and stationary fan rotors; hidden pages do not advance fans. Tweens, timers, subscriptions, pointer/blur listeners, textures, cable geometries and owned hardware resources have cleanup paths. No external model/image assets or AI calls are needed.

### Focused verification — 11 representative scenarios

**Native rules/persistence: 7/7 passed** with `node --test tests/assembly.test.ts`:

1. Valid alternative orders retain motherboard/CPU/cooler prerequisites and panel restrictions.
2. Wrong mounts and occupied slots reject; either RAM module can use either free supported DIMM target.
3. Dependencies and attached cables protect removal.
4. Every cable requires two distinct matching endpoints and its components; reversed endpoint order is accepted.
5. Every missing required part prevents boot; a complete build passes.
6. Every missing cable independently prevents boot; duplicate connections cannot form a valid persisted build.
7. Valid owner-scoped restoration succeeds; incompatible/corrupt/expired/dangling state rejects and unrelated sensitive fields are not copied.

**Browser: all 4 distinct cases passed**, Chrome, one worker, port 5197 and existing synthetic Auth/catalog fixtures. External requests are blocked; the actual local backend on 54321 and user's frontend on 5191 were not operated on.

| Case | Observed result |
| --- | --- |
| Museum entry/exit, actual 3D drag and camera focus | One Canvas, motherboard installed by mouse drag, focus changes view, return control works and returning to museum restores saved Free Explore position. |
| Full assembly walkthrough | Installed all 11 parts and explicitly connected all 11 cables through the UI; early boot/dependency/wired-removal rejection, successful startup, readable welcome monitor, smooth back/top inspection, stationary reduced-motion fan, complete reload with power off, SSD disconnection/removal/reinstallation. **Zero GLB/Storage requests.** |
| Mobile touch, FA/RTL and reload | 390×844 touch emulation, button installation, no horizontal page overflow, Persian text/RTL, reduced motion and build restoration. |
| Exit cleanup | Tracked rendered Lab geometry/material/monitor texture resources dispose on return; only the museum Canvas remains. |

The final four-case run passed the full-build, mobile and disposal cases (49.2 s / 9.7 s / 9.4 s). The entry/exit case initially exceeded the test's 5-second museum-ready wait after return; it passed alone in **16.9 s** after allowing the existing readiness barrier 15 seconds (20.2 s including startup). Pose assertions were retained and no museum camera/persistence code was changed for this timing correction. Earlier implementation checks found and fixed a genuine CPU-plus-cooler snapshot validation defect and cable-drawer visibility before final acceptance. No full regression suite was run.

`npm run typecheck` passed. Changed TS/TSX/test ESLint passed. **One final `npm run build` passed**, including TypeScript; Vite bundling completed in 1.90 s. The existing large application chunk and ineffective services dynamic-import warnings remain. Lazy Lab outputs were approximately 20.65 kB UI JS, 35.53 kB scene JS and 10.40 kB CSS before gzip. Existing THREE.Clock deprecation and museum shader precision info logs were observed; final Lab scenarios recorded no page exceptions. This does not certify a warning-free full application.

### Visual evidence

Actual browser renders, opened and inspected:

- [Desktop workstation](evidence/01-workstation-desktop.png)
- [Completed running build](evidence/02-completed-build.png)
- [Persian mobile view](evidence/03-mobile-fa.png)
- [Mobile after restoration](evidence/04-mobile-restored.png)
- [Focused successful monitor](evidence/05-monitor-success.png)

### Preservation and limits

Phase 09A only changes the files enumerated above and this report/evidence. The working tree contains earlier and concurrent visual/admin/auth changes; they were preserved, not reset or folded into this mission's claims. Pre-09A hashes under `.tmp/phase09/` confirm that `MuseumNavigation.tsx`, navigation state/collision, museum visit persistence, category showcases, uploaded-model pipeline, Supabase files and package contracts were not changed by this work. Other existing files changed independently during the session, so the snapshot is not a blanket unchanged-workspace claim. No account/security/backend operations were performed.

This is a fixed educational assembly simulation, not CAD, dynamic rigid-body collision, thermal/electrical or firmware emulation. Shapes, connector pin details and cable curves are simplified; collision uses bounded interaction and deterministic mounts, not physical contact simulation. Mobile acceptance used Chrome touch emulation, not a physical device or FPS certification. Private CPU/motherboard museum GLBs are neither needed nor verified here. The additional 3D cable-drag input has not had a separate browser acceptance case; the explicit endpoint workflow for every cable and real 3D part dragging were exercised. No production-preview walkthrough or unrelated museum/Landing/CMS regression matrix was run.

**Phase 09A complete within this scope. Phase 09B, AI and troubleshooting chat have not been started.**

2026-10-27 — Phase 09A.1 adds studio/case/staging/cable polish, optional optical/front I/O/peripherals and compatible snapshot v2; required 22/22 is unchanged. [Short report and evidence](../assembly/ASSEMBLY_LAB_09A1_POLISH.md).
13 native cases and the operator-approved replacement focused browser scenario passed; one build passed, 20-cycle memory stayed flat. Short windows do not certify sustained 60fps; final render-only disc/label/React-subroot cleanup was typechecked without another browser/build run. Phase 09B remains unstarted.

## Phase 09A.1 — Concept-led visual and interaction polish — 2026-10-27

Continued the existing Lab and used the supplied concept as visual direction. The studio now has restrained CORE gallery bays/amber trim, a warmer graphite palette, pooled bevelled hardware and brushed roughness, curved fan blades, additional board/GPU/PSU/RAM detail, and a labelled printed work mat. Staging was rearranged so the case/PSU do not obscure the motherboard and GPU. Optional loose hardware appears only in its tray context; installed/connected optional devices retain their functionality.

The larger monitor is fixed at the rear-right station from entry, with improved stand/bezel and a localized CORE No signal / boot / welcome screen. It cannot be dragged or removed. The existing monitor identity and cable requirements remain; old v1/v2 snapshots normalize to the fixed installed display without clearing other progress. Required completion stays 22/22, now beginning at **1/22** because the display is already present. The guided sequence no longer asks visitors to install it.

Desktop panels are narrower (232px tray / 264px guidance), use compact single-column rows and independent collapse controls. EN/FA controls and the existing mobile sheet remain available. Persian spacing/line breaks were tightened; numeric progress uses explicit direction isolation.

**Second DDR fix:** enlarged ray/AABB targets previously overlapped, and the first A2 hit won even when the visitor aimed at B2. `assemblyTargeting.ts` resolves the pointer on the DIMM mounting plane and chooses the nearest lane. It deliberately includes occupied lanes so aiming at occupied A2 still rejects rather than silently substituting B2. Existing slot compatibility, prerequisites, occupancy and power/panel guards remain. Targets distinguish available/occupied slots, and error feedback identifies the actual slot. Successful installation still animates to its authored position and orientation.

### Focused verification

- Only three browser cases ran, one Chrome worker on isolated port 5198 with existing synthetic fixtures: **3/3 passed in 26.7 s**. Actual RAM drag installed A2, rejected occupied A2, then installed the second module in B2; final orientation and non-overlap were asserted. Actual CPU drag rejected missing motherboard, then snapped correctly and supported removal. The walkthrough covered default composition, panel dimensions/collapse, Guided/Free, fixed display, accessible A2/B2 installation, and desktop/mobile FA/RTL without page overflow or page exceptions.
- After the screenshot-confirmed monitor/PSU occlusion correction, **only the visual walkthrough** was repeated: passed in 10.1 s (11.7 s including startup). Passing interaction tests were not repeated. Four browser captures were inspected under [`docs/assembly/concept-polish/`](../assembly/concept-polish/): default, display focus, desktop FA and mobile FA.
- `npm run typecheck` and ESLint on changed TS/TSX/test files passed. **One `npm run build` passed** (Vite 1.39 s). Existing chunk-size/services-import warnings and Three Clock/shader precision warnings remain. No unrelated suites, backend tests, performance soak or physical-device tests ran. A final CSS/locale-only numeric-direction adjustment was source-reviewed after capture/build; it was not recaptured or rebuilt.

Changed: Lab definitions/store/rules/snapshot normalization, scene/hardware/studio/camera/CSS, optional staging, UI, EN/FA assembly strings; new `AssemblyMat.tsx`, `assemblyTargeting.ts` and `tests/assembly-concept.spec.ts` / `.playwright.config.ts`; this append and captures. A 216-file pre-pass hash comparison found no changes outside Lab modules/locales: museum camera/navigation/persistence, CMS, Auth, backend, Landing and package contracts were preserved.

Limitations: procedural educational hardware approximates the concept rather than reproducing its photorealistic assets. Narrow portrait views use presets/focus to inspect the mat or display. Full boot/peripheral regression, all camera poses and performance certification were intentionally outside these three focused checks. **Stop at 09A.1; no 09B or AI work started.**

### Follow-up — open side-panel clearance — 2026-10-27

The operator's orbit screenshot confirmed the parked upright panel obscured the parts mat. The open panel now lies flat on a shallow storage shelf below the left side of the desk, entirely below the work surface. Its closed mount is unchanged. A single cancellable timeline routes around the outer desk edge, rotates clear of hardware and slides into storage; reduced motion uses the final pose directly. The initial JSX pose stays stable so store rerenders cannot jump ahead of the animation.

One additional focused browser case passed (15.0 s; 18.2 s including startup), checking above-floor/below-table bounds, the real open/close controls, reversal during motion and reduced motion. The stored-panel screenshot was visually inspected: [`05-panel-stored.png`](../assembly/concept-polish/05-panel-stored.png). Typecheck and changed-file ESLint passed after this follow-up. The prior successful production build was not repeated for this localized geometry/motion correction. No unrelated regression suites or Phase 09B work ran.

## Phase 09B — Troubleshooting and shared offline CORE assistant — 2026-10-28

Completed on the existing 09A/09A.1 working tree. Added **Explore / Assemble / Troubleshoot** learning modes while retaining the original Guided/Free assembly flow. Explore permits inspection without installation/removal. Seven deterministic lessons cover no power, fans/no image, missing memory, GPU power/display, missing SATA data, CPU_FAN/cooling warning and EPS/POST failure. Each lesson provides symptoms, an observation question, an inspect/highlight action, hints, a four-step checklist, real repair controls, repeatable power testing and a cause/explanation after successful startup.

Faults operate on a separate copy of the completed build, or an explicitly selected reference practice build. Mount, endpoint and boot validation still come from the existing rules. A failed diagnostic startup enters `faulted`, which blocks rewiring/reseating until simulated power is switched off. Returning restores the original required/optional assembly and peripherals with power off. During the exercise, persistence saves the original copy; a reload restores that original assembly rather than an interrupted fault. Snapshot version, reference ID and owner-scoped storage contract remain unchanged.

**One assistant architecture:** museum curator, exhibit Inspect, assembly and troubleshooting now use `CoreAIPanel` / `MockCoreAIProvider`. It uses a small curated EN/FA knowledge base, selected component/slot/dependencies, published catalog UUID/metadata and recomputed validation findings. It clarifies missing symptoms, states uncertainty for unsupported questions and visibly identifies itself as **Demo Assistant / Offline Mode**. Chat is bounded and memory-only, separated by owner/context/locale and cleared on owner change/sign-out. No API key, model installation, network inference, hosted endpoint or backend change is required. Legacy `curatorService` delegates to the same provider. Typed requests/responses/errors, explicit provider selection, cancellation/timeout and future gateway/rate-limit/fallback policy contracts are documented in [CORE_AI_PROVIDER_CONTRACT.md](../assembly/CORE_AI_PROVIDER_CONTRACT.md). Real providers remain unconfigured and fail visibly; no silent mock failover exists.

**Operator-requested monitor corrections:** moved the fixed monitor farther inside the desk, including its ports/contact patch; added a Monitor shortcut to the camera toolbar. Successful startup presents POST → OS boot → Welcome to CORE → desktop. The wallpaper is the actual Windows 11 Bloom artwork copied unaltered from the installed Windows image; provenance is recorded beside the asset. The taskbar/desktop are an educational simulation. A connected mouse now follows actual pointer movement over the 3D screen using mesh UV coordinates. Connecting the keyboard opens a simple Notepad on the screen: click it and type, including line breaks, IME/paste through a native input bridge; Escape releases typing focus. Removed the external cursor sliders and typing field. Notes remain transient and do not enter snapshots or AI requests. Pointer/text updates no longer cause repeated assembly-storage writes. One existing monitor texture and one active WebGL canvas are retained.

### Focused verification and evidence

- **8 native cases passed** (`node --test --test-concurrency=1 tests/phase09b.test.ts`, 238 ms): all seven real-state faults and repairs, positive boot validation, selected published UUID/recorded facts, different component/target/dependency answers, current EN/FA diagnostic findings, unknown/missing-symptom handling, offline operation with fetch prohibited, disabled/unconfigured/failure/timeout/cancel errors and owner/context history isolation. These passing cases were not repeatedly rerun during later UI work.
- The initial dev-browser walkthrough exercised real part/endpoint controls through **22/22**, then exhausted its overall time budget. Its continuation encountered invalid WebGL programs/context loss. Switched to an isolated production preview on **5199**, synthetic existing fixtures and SwiftShader; the normal **5191** frontend target and local backend configuration were not changed.
- Production-browser checks completed **Power On → Welcome/desktop → introduce missing RAM → observe/question/inspect → rejected powered repair → power off → install B2 → successful restart**, including checklist 4/4 and preservation of the original optional mount. One test text mismatch was corrected to the exact existing power-off warning. The full initial scripted case is not reported as an uninterrupted green run: subsequent steps exposed a genuine Escape/focus-loss bug, which was fixed at the shared dialog keyboard boundary.
- The final **remaining-interactions browser case passed in 48.1 s (51.9 s including startup)**. It verified actual projected mouse coordinates, direct screen click/focus, real multiline keyboard entry, Escape release, the dialog Escape regression with focus deliberately on body, FA/RTL mobile chat and troubleshooting, restoration of original parts/peripherals without persisting note text, SPA Lab → Museum context separation, catalog-only answers inside CPU schematic Inspect and preservation of the active Inspect phase after closing chat. No page exceptions or shader errors occurred in this final run. A click-focus regression in the new Notepad bridge was corrected before this final run.
- Typecheck and changed-file ESLint passed. Production builds passed; the final Vite build took **1.66 s**. An initial build was followed by necessary rebuilds for the operator's additional direct-input requirements and the confirmed focus correction. No unrelated regression suite, performance soak or physical-device test ran. Existing chunk-size/services-import warnings remain.
- Opened and visually inspected the [Bloom desktop/monitor view](../assembly/phase09b/01-desktop-inset-monitor.png), [successful repair](../assembly/phase09b/03-repaired.png), [FA mobile assistant](../assembly/phase09b/04-fa-mobile-assistant.png), [FA mobile troubleshooting](../assembly/phase09b/05-fa-mobile-troubleshooting.png), [museum Inspect assistant](../assembly/phase09b/06-museum-assistant.png) and [direct monitor Notepad](../assembly/phase09b/07-direct-monitor-notepad.png). The diagnosis capture is also retained in the same folder.

Changed scope: new `features/coreAI` provider/context/knowledge/chat modules; Lab troubleshooting definitions/panel, store/rules/scene/camera/UI/locales and monitor/desktop/input modules; shared curator entry/adapter and dialog keyboard handling; a guarded AI action in existing Inspect/navigation; focused tests and these documents/assets. A 218-file pre-pass hash comparison found no mission changes to Supabase, packages, Auth, CMS or Landing. Separate concurrent Entrance/atmosphere edits and a persistence-file formatting change were observed and left intact; this report does not attribute those changes to 09B or claim a globally unchanged working tree.

Limitations: the assistant is curated offline demonstration software, not real inference or a diagnosis of physical hardware. Cooling is a CPU_FAN connection lesson, not thermal simulation. Notepad and pointer behavior are intentionally simple; no real OS/apps run. Private exhibit GLBs and broad earlier-phase regression/performance certification were not part of this verification. **Phase 09B complete within this scope; stop here.**

## Phase 09A follow-up — Hardware laboratory and assembly automation — 2026-10-28

Continued the approved working tree. Replaced the cyclorama with a closed, four-sided graphite engineering room: framed architectural panels, complete ceiling/floor/corners, warm inlays, emissive overhead task fixtures and framed glass partitions looking into bounded museum annexes. Each elevation includes storage drawers, labelled ESD stock, precision tool/strap/cable organizers, oscilloscope/multimeter-style reference displays and CPU/mainboard/PCIe diagrams. The lower wall identity reads **CORE / HARDWARE ASSEMBLY LAB**. Instrument readings are decorative bench references, not measurements of the simulated PC. No extra ambient animation was added. Workbench, case, monitor, staging, peripherals, targets and camera envelope were not relocated or redesigned.

Environment geometry is merged into ten reusable material batches with one 2048 print atlas, tiled procedural floor texture and pooled soft-contact decal. Walls sit at ±32; furniture's closest depth is 26.8, outside the camera's radius-25 bound. Ceiling/task housings stay above its height-23 limit. The existing four lights and one-time PMREM environment remain; reflections are environment-based and shadows are contact treatments, with no shadow maps, transmission, screen-space reflections or postprocessing. Geometry/materials/textures and interrupted GSAP timelines dispose on exit. This is procedural architectural scenery, not photorealistic imported equipment; no new dependencies or downloaded assets.

**Auto Assemble** sits beside the existing footer controls; **Auto Connect Cables** is in the cable dock. A transient controller traverses existing required definitions, retains installed components/occupied DIMMs, excludes the fixed monitor and optional devices, and respects dependencies, panel, power, owner and current mode. Parts lift clear, orient, approach the open side and seat with a short highlight hold. Cables reveal along the existing rounded authored paths while their connectors advance to the real endpoints. Only after motion completes does the controller invoke the existing `install` or explicit `select`/`port` actions; compatibility/occupancy/connection validation is never bypassed. No automatic Power action exists.

Progress/Cancel reuse the existing footer/dock. Repeated starts and conflicting manual installation, disconnection and drags are blocked during automation. Cancel, panel/power/mode changes, restart, page hide, owner hydration and unmount abort pending motion; settled valid steps remain, while the uncommitted part returns to its previous pose or the temporary cable disappears. Reduced motion uses immediate placement and the same validated commit boundary. Snapshot version/fields remain unchanged; transient automation never enters persistence. Existing Troubleshooting/AI functionality was retained, with no new 09B work.

**Labels:** removed the solid black caption strips. Localized off-white text retains consistent sizing/wrapping, restrained text shadow, existing part associations and bounded placement; amber footprints remain. Desktop caption capture confirms readable transparent labels. A final mobile-only CSS correction visually hides the redundant footer message while the sheet is open (retaining its live announcement), and completion copy no longer tells an already-running PC to power on.

### Focused verification

- Exactly **three new native scenarios passed once**, serially (235.5 ms): actual-store partial/full assembly with occupied DIMM preservation, valid ordering/no duplicates/manual reinstall; missing prerequisites and all required cable endpoint commits/no duplicates/manual disconnect; interrupted animation, valid owner-scoped snapshot, closed-panel rejection and owner-change/late-completion protection. Earlier passing assembly/09B suites were not rerun.
- Typecheck passed; changed TS/TSX/test ESLint passed. **One production build passed**, including TypeScript (Vite 981 ms), with the existing large-chunk/services-import warnings. A cable-curve extraction accidentally removed the connector's `Vector3` import after the standalone check; the first browser attempt exposed it, and it was restored before this successful build. Final art-position/color constants and mobile CSS/completion copy were edited afterward; no second build was run.
- One main browser walkthrough on isolated **5199**, synthetic fixtures, Chrome/SwiftShader: initial attempt stopped on that import defect. After repair, **real Auto Assemble completed all 11 hardware identities**; prerequisite feedback and seven completed cable connections also passed. The 25-second cable wait then expired with state still valid and actively progressing (18/22). This is not reported as a green uninterrupted walkthrough.
- Ran only a continuation of the uncompleted steps, from the observed valid build/seven connections, in reduced motion: **passed in 37.4 s / 42.1 s including startup**. Remaining four real cable connections completed, power stayed off until an actual Power click, and boot reached desktop. Existing Front/Right/Back/Left/Iso/Parts-mat commands kept camera bounds; one Canvas, no page exceptions/shader errors, transparent EN captions, FA/RTL UI at 390×844 and no page overflow passed. Four [captures](../assembly/laboratory/) were opened once: running desktop, opposite wall, mat captions, Persian mobile. The mobile capture precedes the final message-overlap CSS fix. Mobile 3D caption refresh was not separately asserted.
- No full regression, repeated passing native tests, performance soak, physical-device or sustained-FPS certification. Software rendering was slow; the browser timeout does not establish a hardware performance regression or acceptable FPS. Existing Three Clock deprecation remains. No backend/account/security operations occurred.

Changed existing: `AssemblyStudio.tsx`, `AssemblyScene.tsx`, `AssemblyCable.tsx`, `AssemblyMat.tsx`, `AssemblyLab.tsx`, `assemblyStore.ts`, `assembly.css`, EN/FA assembly locales. Added: `laboratoryResources.ts`, `assemblyAutomation.ts`, `AssemblyAutomationMotion.tsx`, `AssemblyAutomationControls.tsx`, `assemblyCableCurve.ts`, focused automation test/browser config/spec, captures and this append. Pre-pass SHA-256 comparison confirms source changes were confined to those Lab/locales files: hardware visuals/definitions/extensions, rules, persistence schema, camera, existing AI/troubleshooting modules, museum/Landing/CMS/Auth/backend/packages stayed unchanged. Earlier unrelated dirty-tree work was preserved. **Stop after this 09A follow-up.**

### Targeted correction — Parts-panel installation access — 2026-10-28

**Cause:** Auto Assemble was exposed only in the footer, while Auto Connect had an inventory-level entry point. The nonwrapping footer combined fixed progress width, camera/actions, automatic-operation text and optional success text without a sufficient shrink budget; adding another labelled action could push controls out of the viewport. Explore/Troubleshoot and powered states also disabled automation without an adjacent explanation. This was an accessibility/discoverability integration defect; the validated controller and actual hardware motion already existed.

Added **Install All Parts / نصب همهٔ قطعات** at the top of Parts, above Required/Optional. It calls the same `assemblyAutomation.start('parts')`; no installation implementation was added. The inventory now retains a full-width sticky action, Cancel, current component, progress and completion feedback. Cable automation uses the same panel presentation. Disabled-state explanations identify scene readiness, an active drag, Assemble mode, power-off or open-panel prerequisites without bypassing them. Removed the redundant footer installation button and automatic-operation text; retained progress, camera, case panel, restart and Power controls. Fixed flex shrinking and narrow navigation/footers through 320 px. Opening another dock pane resets its scroll so the top action cannot inherit a scrolled-out position.

**Verification:** one browser case passed in **52.9 s / 58.5 s including startup**, at 1366×768, with the actual working-tree app on isolated 5199 and only Auth/catalog fixtures. The usual 5191 frontend was not reachable during this check, so this is not a claim about an authenticated existing user tab. The test clicked the visible Parts action on a valid partially assembled **Free** build, recorded intermediate positions of the actual CPU/GPU scene objects (not counters), and checked every required hardware object's final mount position/orientation. All 11 identities were installed; the preinstalled swapped DIMMs retained B2/A2; the single existing monitor-power cable and power-off state were unchanged. Cancel/current-component/completion UI was visible. The same run checked EN at 390/320 px, FA/RTL at 320 px and desktop, hit-tested the action and remaining footer controls inside the viewport, verified no horizontal overflow, one Canvas and zero page exceptions. [Desktop and FA captures](../assembly/install-parts-correction/) were inspected; [motion samples](../assembly/install-parts-correction/motion.json) retain the physical movement evidence. The final progress-bar amber styling follows capture; it was not recaptured.

Typecheck and changed-file ESLint passed. No unit tests, build, full regression or repeated browser runs were performed. SHA-256 checks confirm `assemblyAutomation.ts`, `assemblyStore.ts` and `AssemblyAutomationMotion.tsx` unchanged. Only Lab UI/CSS/locales, the focused browser spec/config and this correction note changed; laboratory scenery, persistence, rules, manual installation paths, existing 09B/AI, Museum/Landing/CMS/backend were preserved. Physical mobile hardware and the unavailable 5191 session were not verified. Stop after this correction.

## OpenCode integration — 2026-10-28

Prepared the official OpenCode Console integration within the existing Phase 09B assistant. Museum, Inspect, Assembly and Troubleshooting continue to use the same `CoreAIPanel` and client; the existing curator service delegates to that client. No new phase, chatbot, migration, dependency installation, hosted deployment, running-service change or billable inference was performed. Earlier unrelated dirty-tree work was preserved.

**Behavior:** authenticated server capability discovery selects the existing Offline Demo when no key is configured. A configured server reports OpenCode ready, then an actual successful answer is labeled Live AI with its model. EN/FA, RTL, per-answer provenance, manual retry, cancellation and an explicit offline choice are retained. Provider errors never silently become mock success. Histories stay bounded, owner/context/locale-scoped and memory-only; live prompts include at most six relevant recent messages. Existing offline assistant prose is excluded from live history.

**Server:** `core-ai` retains JWT verification, validates the current user through Auth and `core_current_role`, denies Supabase anonymous accounts, and reads published/AI-enabled exhibit facts under the caller's RLS. No service-role credential is needed. Requests send only an exhibit UUID or compact simulated build/selection/power/panel/scenario data. The server recomputes next steps, component dependencies, connector requirements and findings through existing deterministic definitions/rules. Client exhibit specifications and findings cannot become authoritative facts. No AI action writes to assembly or diagnostics. Personal/profile fields, desktop text, account tokens and the full catalog are excluded from prompts; recognizable pasted emails/tokens and known secrets are redacted.

Exact-origin CORS, 20 KB streamed input limits, 1,000-character questions, six bounded history messages, 700 output tokens, a 20-second server deadline, cancellation and safe normalized upstream errors are implemented. Inference limits are six/minute and 30/hour/user, one concurrent/user and 120/hour/server isolate, with bounded counter memory. **These in-memory limits reset on worker replacement and are not distributed/global budget enforcement.** Authenticated-only use is prepared; broad public/anonymous paid access still requires shared rate limiting, account-abuse controls and provider spending limits. Existing Auth/security settings and database contracts are unchanged.

Official [Inference documentation](https://opencode.ai/v2/docs/console/api/inference) and [model compatibility](https://opencode.ai/v2/docs/console/models) confirm Bearer auth, `kimi-k3` and the OpenAI Chat Completions endpoint. The default is pay-as-you-go. The official [Go endpoint](https://opencode.ai/v2/docs/console/go/) is supported via a server-only URL override; that plan's coding-agent usage conditions must be checked for this educational application. No browser/account-token reuse, subscription bypass or assumption about ChatGPT Plus credits/free app models was added.

### Files in this integration

Created:

- `src/features/coreAI/OpenCodeCoreAIProvider.ts` — typed, abortable Supabase gateway adapter with compact context serialization.
- `src/features/coreAI/coreAIGateway.ts` — existing public Supabase config/current session adapter, loaded only for gateway use.
- `supabase/functions/core-ai/index.ts` — Deno entrypoint, current-user authorization and RLS-scoped exhibit reads.
- `supabase/functions/core-ai/handler.ts` — bounded request handling, capability selection, limiter, redaction, official inference transport and safe normalization.
- `supabase/functions/core-ai/context.ts` — catalog identity resolution and deterministic simulation context validation.
- `supabase/functions/core-ai/deno.json` — the same pinned Supabase import convention as the existing Edge Function.
- `supabase/functions/.env.example` — empty key and documented default model/endpoint/origins.
- `tests/core-ai-opencode.test.ts` — four short intercepted-HTTP verification groups.
- `docs/assembly/OPENCODE_AI_SETUP_FA.md` — local/hosted key setup, endpoint selection, activation, errors and network-region checks.

Updated:

- `src/features/coreAI/coreAIContracts.ts`, `coreAIClient.ts` — OpenCode/automatic selection, typed capability/history/simulation fields and bounded transport.
- `src/features/coreAI/CoreAIPanel.tsx`, `coreAICopy.ts`, `chatHistory.ts` — localized mode/error/cancellation/retry controls, request history and preserved answer provenance.
- `src/features/coreAI/coreAIContext.ts` and `src/features/assembly/AssemblyLab.tsx` — pass only simulated power/panel state in addition to the existing build context; no assembly operation/rule changes.
- `supabase/config.toml` — only appended the enabled `core-ai` entry with `verify_jwt=true`; pre-existing Auth/admin configuration edits were preserved.
- `docs/assembly/CORE_AI_PROVIDER_CONTRACT.md` and this progress record — current architecture, limits, verification and operator handoff; earlier documentation retained.

The existing `supabase/functions/.env` was preserved without reading or overwriting credentials. `git check-ignore` confirms that exact secret path is ignored. Mock provider, hardware knowledge, museum/Landing/navigation/Inspect implementations, CMS, Auth, existing Edge services, security switches and database migrations were not edited by this integration. The single build refreshed ignored `dist` artifacts.

### Focused verification and limits of evidence

- `node --test tests/core-ai-opencode.test.ts`: **4/4 passed**, 265 ms total. Synthetic intercepted HTTP only: missing-key labeled offline mode with zero upstream calls; normalized live output, bounded history and Go routing; invalid key/403/429/network/malformed/timeout/cancellation behavior without fake success or secret disclosure; validated museum/Inspect, assembly and Persian troubleshooting requests. Auth/origin/request-size guards and local limiter exhaustion were also checked within these four groups.
- Final review found that status discovery needed its own cancellation race if session lookup stalls. Added that assertion and reran **only the error group** with `node --test --test-name-pattern='3 —' tests/core-ai-opencode.test.ts`: **1/1 passed**, 210 ms total. The other passing groups were not rerun.
- `npm run typecheck`: **passed**. The first attempt found a protected Supabase client property; the adapter now uses the existing public environment URL. The successful production build also typechecked the final small status/auth changes.
- Changed-file ESLint: **passed, no warnings**. The initial lint found redundant quote escapes in one test regex; those were removed before the successful run.
- Exactly **one** `npm run build`: **passed**, Vite 4.31 s, with the pre-existing large-chunk and ineffective-dynamic-import warnings.
- No unrelated museum/Landing/CMS/Assembly regression suites, browser walkthrough, real account request, remote deployment, live provider request or region-connectivity test was run. Native fixtures establish gateway/client behavior; actual deployed Auth/RLS/gateway/JWT/model/credit/network acceptance remains operator verification. No live OpenCode inference is claimed.

### Operator handoff

Place a supported OpenCode Console key in **`E:\core\supabase\functions\.env`**, variable **`OPENCODE_API_KEY`**. The safe example sets `OPENCODE_MODEL=kimi-k3`, `OPENCODE_API_URL=https://opencode.ai/inference/openai/v1/chat/completions` and the approved local frontend origins. For the existing local backend, from `E:\core`:

```powershell
npx supabase functions serve core-ai --env-file supabase/functions/.env
```

Restart that function after editing the secret. Keep JWT verification on and make sure frontend and function target the same Supabase environment. Hosted deployment was not authorized or performed: later set the key/model/URL and exact site origins in the intended project's Edge Function Secrets, then deploy the prepared function with separate authorization. Send one short real question and verify an actual **Live AI** answer; configuration-ready status alone does not validate the key. See the [Persian setup guide](../assembly/OPENCODE_AI_SETUP_FA.md) for precise steps, compatibility/credit/403 errors and checks from the intended host region.

**Stop after preparing this integration.** Supported credentials, actual deployment and one authenticated live question are the remaining connectivity acceptance steps; production-scale distributed spending enforcement is explicitly outside this authenticated-only preparation.
