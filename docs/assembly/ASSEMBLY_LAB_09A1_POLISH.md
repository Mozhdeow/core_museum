# PC Assembly Lab 09A.1 — 2026-10-27

**Audit.** Required parts/mounts/ports are authored world-space tuples in assemblyDefinition.ts. Former 32-segment Catmull-Rom tubes had no clearance check and overshot hardware. Loose staging was scattered (rear fan [3.55,1.11,-1.15], PSU [3.45,1.45,1.8]), leaving the amber mat largely unused. AssemblyCamera allowed 20-unit orbit behind the Z=-5 backdrop. The side sheet had 0.09 opacity. The baseline harness did not reach authenticated rendering; its initial Vite Cookies watcher lock was corrected by relocating the disposable Chrome profile. **No valid before-performance numbers exist.**

**Implemented.** Ordered staging, 360° studio, four fixed lights/generated environment/contact decals, loading, bounded presets, vented case/tinted panel, connectors, eased fans and corner success. Added optical/front/rear I/O, six optional leads (separate USB-C), seven simulated peripherals and EN/FA sheets. Required **11+11=22/22** and diagnostic Power remain unchanged; physical switches demonstrate F_PANEL. The conceptual AM4/DDR4/Type-E board is not a branded replica.

### Authoring / persistence

- Required wires live in assemblyDefinition; optional definitions in assemblyExtensions. Format: `{ends, route:[source,...worldWaypoints,target], radius, color, kind}` (required connector kinds are mapped in AssemblyCable). assemblyGeometry makes circular fillets; sampled authored bends are ≥0.04 scene units. This is an artistic value, not real cable-installation advice. Tests check board/GPU/cooler/RAM/tray/shroud/case solids, with 0.006-unit surface tolerance and 0.14-unit docking allowance. Rendered overlap never validates a connection. Staging bounds derive from tray transforms.
- V2: `{version:2,reference,owner,savedAt,installed,connected,mode,panelOpen,optionalParts:[],optionalConnected:[],peripherals:{device:port},opticalOpen}`. Same account key/30-day expiry; valid v1 normalizes with empty optional state. Unknown IDs, incompatible/occupied ports, missing leads and corrupt/dangling state reject. Credentials, typed text, cursor and power are not saved; reload is off.

| Peripheral | Compatible target / prerequisite |
| --- | --- |
| Keyboard, mouse, USB-A storage | Rear USB-A; front also requires frontUsb |
| USB-C storage | Front USB-C plus its separate frontUsbC lead |
| Headphones | Rear green line-out; front additionally needs HD Audio |
| Microphone | Rear pink mic; front needs HD Audio; meter labelled simulated |
| Disc | Installed optical drive, SATA data/power, open tray for insertion |

Responses require a complete running base build; unplug reverses them. Line-in/Ethernet are labelled information sockets. No real device APIs or external assets.

### Verification

**13 native cases passed** (original seven + six risky extension checks); only failing/changed geometry checks were repeated after fixing two SATA/GPU intersections. Typecheck and changed-file ESLint passed after repairs. One build passed (Vite 2.36 s), retaining chunk/services-import warnings. Protected Landing lint/its earlier two errors were untouched.

The first browser run stopped on brand spacing; **one operator-approved replacement passed in 46.2 s**: loading/preset, UI part/cable, panel rejection, diagnostics/boot, optical/USB lead, compatible/incompatible devices, keyboard, v2 reload off, FA 390×844/380×776. Remaining assembly used fixtures. No page exceptions or GLB/Storage requests.

| Short normal-motion window | Mean / p95 ms | >33 ms frames |
| --- | --- | --- |
| Initial | 18.19 / 21.70 | 1 |
| Orbit | 15.67 / 18.70 | 1 |
| Install | 17.44 / 19.50 | 2 |
| Power-on | 15.74 / 17.90 | 2 |
| Seven devices | 17.43 / 20.50 | 0 |

Twenty cycles stayed **29 geometries / 5 textures**; draws 295–522. Short headless windows (~55/57fps initially/with devices) do not certify sustained 60fps or isolate CPU/GPU limits. Skipped soak, physical phone, full locale/mobile matrix, broad regression and second build. Opt-in ?debug=perf is inert otherwise; demand mode has no FPS estimate.

Eight [renders](visual-pass/) were inspected once; [raw metrics](visual-pass/performance.json). Final review fixed disc axes/caption and replaced Drei Html after a React subroot-unmount warning with one pooled engraving texture/HUD tooltip. Last render-only repairs were **typechecked, not replayed/recaptured/rebuilt**; captures predate them (one constant texture added). Final warning-free browsing is not certified.

**Files:** Lab modules/CSS (data, rules, store/persistence, render/camera, studio/cables/optional scene, UI/loading/perf), EN/FA assembly.json, three tests/assembly-polish* files, this evidence/report and two Phase 09 lines. Compared 206 existing source/backend/package hashes: no outside-Lab/locales changes. Backend/Auth/CMS/Landing/museum navigation-camera-persistence/packages/security remain preserved. No further approval is required for implemented scope. **Educational simulation only; 09B/AI not started.**

## Presentation-only UI/UX pass — 2026-10-28

Replaced the permanent panel pair with three regions: slim header, collapsed tool rail/single contextual dock, and compact progress/action footer. Camera actions use an icon popover; details/legend use an expander. Troubleshooting and the existing AI conversation share the dock. Mobile CSS provides peek/half/full sheets with logical RTL positioning. Quiet 140 ms hover, delayed port tooltip, visible focus and reduced-motion overrides; Power is the sole filled amber CTA. Museum AI callers keep the compatible modal default.

Reused museum tokens: void `#050505`, surface `#0d0d0d`, elevated `#171717`, amber `#ffb547`, orange `#ff7a18`, rare signal cyan `#55e6e6`, with Space Grotesk/IBM Plex Mono/Vazirmatn. Added pooled workshop pegboards/tools/component-box shelves, concrete/ESD floor marks, bench braces/props and emissive overhead rail. Still one Canvas, four fixed lights, generated environment/contact decals; no shadow maps, reflections, transmission, external assets or dependencies. Peripheral visuals now include instanced bevelled keyboard keys/atlas legends, curved mouse shell/buttons, padded over-ear headphones/stand, grille microphone/stand, USB-A/C details and iridescent disc/hub/jewel case. Owned resources are disposed.

Owner follow-ups: moved loose peripherals inward using display-only tuples (keyboard/mouse back 0.45 scene units; USBs 0.65; disc/headphones 0.85, with lateral separation). Port targets/insertion formulas remain authoritative. Mat printing now uses one 2048 texture with bounded anisotropy, stronger amber footprints, larger semibold EN/FA captions on dark strips, word wrapping instead of horizontal compression, and bottom-edge caption clamping. No additional draw calls. This final label edit was lint/build checked; the three captures predate it.

**Verification:** 13/13 native assembly tests passed once, serially. Two standalone typechecks were used: first found a missing UI import (fixed), second passed; final `npm run build` including TypeScript passed once (Vite 1.07 s), with existing chunk-size/services-import warnings. Changed-file lint passed after repairs. Hashes confirm assembly definitions/extensions, rules, store, persistence, geometry, camera and troubleshooting unchanged. No backend/Auth/CMS/Landing/package edits by this pass; unrelated concurrent museum/gallery workspace changes were preserved.

**Browser limit honoured:** one existing direct-monitor acceptance case ran once and failed in the added screenshot harness: a private R3F module import had an empty `_roots` registry (`undefined.store`), also producing a duplicate-Three warning. Removed that private camera access; not replayed. Before stopping, boot-to-desktop, physical pointer-coordinate assertions and multiline notepad typing passed. Three desktop [captures](visual-pass/uiux/) (default, Explore dock, powered Iso/peripheral zone) were inspected once. AI/Troubleshoot/mobile screenshots and remaining bilingual/Escape/Museum assertions were not reached. No acceptance claim for those states. The short [perf sample](visual-pass/uiux/performance.json) recorded 58 geometries, 12 textures, 560 calls and ~76k triangles, but only two frames per window under SwiftShader (orbit ~1058 ms): insufficient and not comparable to the prior hardware baseline; no claim of unchanged FPS. No retry, soak, full regression suite or extra build. Bigger product-scale peripherals or changes to core staging/ports would require data/anchor work and were deferred.
