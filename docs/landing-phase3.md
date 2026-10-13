# CORE landing: one continuous physical monitor

The default landing now uses one photograph from Hero through About CORE and Enter Museum. Desktop uses `desktop.png`; portrait phone/tablet uses the dedicated `desktop-mobile.png`. There is one persistent image element and one persistent R3F canvas. Exactly three content chapters remain.

## Review of the supplied recordings

| Before | After | Why |
| --- | --- | --- |
| The monitor, stand, keyboard and case changed shape during the two-photo handoff. | Use the same source photograph throughout the camera move. | The photographs show different hardware proportions and viewpoints. Matching screen corners cannot make the surrounding hardware identical. |
| The handoff needed opacity, masks, independent photo transforms and vertical aspect corrections. | One parent transform supplies translation and uniform scale to the photograph, screen and live content. | There is no replacement moment or geometry reconciliation to notice, in either scroll direction. |
| Hero controls could be blocked by the full-viewport portal layer. | The portal ignores pointer input; the actual screen remains interactive. | Keeps both Hero buttons and monitor content usable. |
| About and Visit titles could overlap. | Outgoing copy leaves before incoming copy appears; backgrounds still blend. | Maintains one readable title. |

## Implementation

- `HeroSection.tsx`: one physical image and one screen inside `.core-stage__world`.
- `journeyGeometry.ts`: both camera endpoints derive from the same source and glass coordinates. The scene retains its native aspect ratio throughout.
- `useLandingMotion.ts`: image size is established on mount/refresh. Each scroll frame writes only a shared translation/uniform scale, plus chapter transforms and opacity. No photo handoff, reveal curtain, aspect morph, counter-scaling or canvas remount remains.
- `journey.css`: pointer input passes through the empty portal to Hero controls. The screen enables input for the live scene and chapter buttons. A static image-edge feather blends the photograph into the page; it does not change during scrolling.
- `LandingPage.tsx`: preload the single asset needed for the current layout.
- `useMuseumEntry.ts`: the final CTA zooms around the actual screen center before existing museum/login navigation. Reduced motion uses a short fade.

The first scroll interval holds the Hero composition. The same physical monitor then grows into the stable stage. About has its dedicated exploded-workstation image; Enter Museum uses the existing hall image. Hidden content remains inert. Scroll reversal, breakpoint changes and reload restoration remain supported.

The approved Intro and its original geometry are separate. The original video experiment remains opt-in at `?heroDive=video`. Authentication and museum routing are unchanged.

## Verification

The browser suite covers six viewport sizes in English and Persian, same-image identity, uniform scale and native proportions throughout the camera move, same-canvas identity, stable locked bounds, slow/fast/reverse scroll, breakpoint changes, readable contained copy, no horizontal overflow, reload, Hero navigation, keyboard CTA, zoom before navigation, reduced motion, delayed image loading without a geometry jump, title transitions, and Intro completion/skip.

Run `npx playwright test --config tests/landing.playwright.config.ts`. Set `PLAYWRIGHT_CHANNEL=msedge` for installed Edge and `PLAYWRIGHT_PORT` if the default port is occupied. The server uses strict-port handling.

Final result on 2026-10-07: **20 browser tests passed (2.9 minutes)** on Edge at `http://127.0.0.1:5189/`. Desktop Hero, intermediate camera positions, the locked stage, About and Visit were visually reviewed; Persian portrait Hero and About were also checked. Protected Intro component, hook, shell, viewport and geometry hashes still match the original baseline.

TypeScript and production build pass. Changed files pass ESLint. Full-project lint retains two pre-existing errors in the protected Intro at lines 298 and 619. Existing large-bundle and ineffective dynamic-import build warnings remain. Browser verification uses Edge with emulated viewports; physical phones and Safari have not been tested.

**Motion review verdict: Approve.** The physical monitor no longer changes photograph or aspect ratio during its camera move. Forward/reverse motion, persistent Canvas, chapter legibility and entry navigation passed verification.
