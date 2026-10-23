# Independent visual and browser QA

Status: LOCAL PASS. Production checks are pending publication and are not implied by the local result.

## Method

Independent browser/visual reviewer, separate from the implementation roles. Used UI Review and ECC-derived frontend verification as instruction workflows; no ECC hooks or runtime are implied. Browser: installed Chromium 156.0.8078.4, headless, Playwright 1.64.1, Windows, one worker and isolated contexts. Local target: http://127.0.0.1:4317/velora-atelier/, serving the production build. No shared CUA session was used.

Story: enter the fictional concept -> explore three spaces -> change the time of day -> navigate the architecture journal -> download the selected original SVG card. Query selections must survive Back, Forward and reload. The same story remains usable without WebGL.

## Verified locally

All eight E2E stories passed in 38.4 seconds. Expanded TypeScript checking and ESLint also passed for the test code.

A ninth scenario then verified actual GPU context loss and restoration locally: 1 passed in 4.4 seconds (2.8 seconds execution), using the real `WEBGL_lose_context` extension. It observes `isContextLost()`, the illustrated fallback, changes the chosen state while lost, restores WebGL, verifies the latest architecture and exercises another light control after recovery.

The architecture-only pixel capture refinement then passed its targeted rerun in 5.1 seconds (one story, 3.7 seconds execution). All nine hashes remain distinct with text/control overlays hidden.

After the supported Three.js shadow constant fix, the integrator's targeted normal journey passed in 4.6 seconds (3.2 seconds execution) with warning-level console capture enabled. No browser console warnings or errors were reported.

| Story | Observed result |
| --- | --- |
| Three spaces and all three light choices | Correct pressed states, URL state and actual WebGL rendering |
| Interrupted and repeated choices | Final selection stays consistent; no page/console errors, failed requests or HTTP errors in the normal journey |
| Design card | Real downloaded SVG, correct filename and selected space/light, fictional status, no remote image/script references |
| History and direct inputs | Back, Forward, reload, valid queries, invalid values and hash preservation pass |
| Navigation and collection | Section links, collection-to-hero transition and focus transfer to chosen hero control pass |
| Keyboard and motion | Named controls, visible focus, Enter activation, pause/resume and system reduced-motion behavior pass |
| Missing WebGL and interrupted scene chunk | Original SVG remains visible; text, controls and download work; morning and midday fallback artwork differs |
| Real WebGL context loss and restoration | Actual loss and restoration confirmed; latest garden/dusk architecture recovered; controls remain usable; zero page errors |
| Responsive and accessibility | No horizontal document overflow; every section reachable; axe WCAG 2/2.1 A/AA reports zero violations in all four viewports |

Viewport coverage: 1440 x 1000 desktop, 390 x 844 mobile portrait, 320 x 740 narrow mobile and 844 x 390 mobile landscape. The fallback journey uses a touch-enabled mobile context with reduced motion and WebGL deliberately disabled.

## Defects resolved and retested

P2 contrast defects in navigation/tab numbers and small mobile italic copy were fixed. P2 visible-label/name mismatches were fixed by matching labels to visible study numbers and wordmark text, adding literal whitespace and using decorative SVG motion icons. The collection focus regression and scene-chunk failure regression pass. No proven P1/P2 or substantial P3 remains from this review.

The reviewer inspected the actual desktop, portrait, 320 px and landscape screenshots and the water/midday and garden/dusk scenes. The light editorial composition, warm stone, water and original architectural geometry are coherent across layouts. No control obstruction or material layout break was observed.

## Evidence

- [Desktop](screenshots/local-desktop.png) and [hero](screenshots/local-desktop-hero.png)
- [Mobile portrait](screenshots/local-mobile.png), [320 px](screenshots/local-narrow-320.png) and [landscape](screenshots/local-mobile-landscape.png)
- [No WebGL and reduced motion](screenshots/local-mobile-no-webgl-reduced-motion.png)
- [Paused scene pixel hashes](screenshots/local-visual-hashes.json): nine distinct state hashes. The final capture method temporarily hides text/control overlays so only architectural pixels are compared.
- [Raw context recovery](screenshots/local-context-recovery.json), [chosen reference](screenshots/local-context-expected-garden-dusk.png) and [restored architecture](screenshots/local-context-restored-garden-dusk.png)

Context recovery compares same-run architecture pixels with motion paused and overlays hidden. An initial strict hash check detected GPU recreation rounding: mean RGB difference 0.01002 on a 0-255 scale, maximum channel difference 1. The prior atrium/morning state differs by 52.73568. The final check permits a mean difference below 1 and requires the restored image to be at least 50 times closer to the latest chosen state than the obsolete prior state. The final targeted pass had zero pixel difference, zero page errors and only the intentional Three.js Context Lost/Restored log messages. PNG decoding uses the browser's 2D Canvas; no image package was added.

## First CI timing investigation

The first CI run, [40031760467](https://github.com/seoshiro/velora-atelier/actions/runs/40031760467), passed seven stories. The long active-motion normal journey reached the repeated-selection phase on both attempts and exhausted the shared 45-second test deadline. Independent inspection of both downloaded browser traces found bounded completed actions: attempt one completed 13 clicks (23,679.2 ms total, maximum 2,386 ms); the retry completed 16 clicks (27,862.2 ms total, maximum 1,846.1 ms). No completed browser action exceeded 2,386 ms. The final pending calls continued through normal visibility/stability/scroll preparation close to the deadline; the traces do not show an individual long action hang. The responsive story also passed in 44.0 seconds on that runner.

This supports cumulative software-rendering/automation overhead as the cause, rather than a permanently unavailable control. [Compact trace timing data](ci-timing-summary.json) preserves the measured call durations. Bulk downloaded evidence is excluded from the repository.

The integrator set the CI story budget to 120 seconds and added explicit limits of 15 seconds per action and 30 seconds per navigation. Local stories remain at 45 seconds and assertions at 8 seconds. All eight stories, active motion, all nine states, screenshots, accessibility scans and the single worker remain intact. The increased whole-story budget accommodates the measured cumulative work, while explicit per-action limits still expose a stalled control. A new CI run must establish the result; the failed first run is not a release pass.

## Second CI diagnostic investigation

The second run, [40032711531](https://github.com/seoshiro/velora-atelier/actions/runs/40032711531), completed the full normal journey including download in 58.4 seconds and 51.7 seconds on retry. Its strict console assertion failed on four Chrome GL driver performance diagnostics; the other seven stories passed. [Chromium's ANGLE source](https://chromium.googlesource.com/angle/angle/+/b4efc051da9dc884087f1ace8185d410d4349d02/src/libANGLE/renderer/vulkan/vk_helpers.cpp) emits this diagnostic during pixel readback with a GPU finish. Source inspection found no application `readPixels` call. Attribution to automated screen capture is an inference from the diagnostic, the application's rendering path and the trace's screen capture activity.

Installed Playwright 1.64.1 types at `types/test.d.ts:7261` support the revised trace configuration: retained failure traces, DOM and ARIA snapshots and sources, with screencast screenshots and screen snapshots disabled. Every explicit architecture, viewport and mobile PNG remains. This removes repeated trace screen capture work while keeping actionable failure evidence. The suite also retains the ninth GPU context recovery scenario.

## Third CI diagnostic classification

The third run, [40033573813](https://github.com/seoshiro/velora-atelier/actions/runs/40033573813), used Chrome 155.0.8059.39 and passed eight of nine stories, including real context recovery in 9.1 seconds. The complete normal journey again failed only on the same four driver diagnostics, with trace screencast and screen snapshots disabled. The earlier trace-cause inference was therefore not established. Explicit scene PNG captures remain part of the journey and can also require image readback. These diagnostics describe a real synchronous GPU readback cost; this review does not label that cost harmless.

The exact verified performance diagnostic is now classified separately only for Chrome major 155, the Chrome channel, Chromium engine, Linux CI and console warning severity. The pattern is fully anchored, permits only the hexadecimal WebGL context identifier and the exact optional final repetition notice, and rejects extra lines or text. The classified count must remain at most four. Every matching diagnostic is retained with its exact text, type, location, browser/version and actual GL vendor/renderer/version metadata in a JSON test attachment and the screenshots evidence directory. Unknown warnings, all console/page errors, failed requests and HTTP errors remain strict failures in the normal journey. Three Node policy regressions cover exact matches and the severity, platform, environment, channel, version and changed-text boundaries. All nine browser stories and all explicit PNG captures remain intact. A subsequent complete CI result is still required for release.

## Remaining verification

Production URL, deployed commit and asset identity, production E2E and production screenshots are pending publication. Firefox, Safari/WebKit, physical mobile hardware and a screen-reader session have not been tested.
