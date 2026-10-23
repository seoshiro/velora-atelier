# Independent code, performance and security QA

Reviewer role: independent code/performance/security agent, separate from implementation. This is an ECC-derived instruction workflow; no ECC runtime or hooks were installed or claimed.

## Scope and status

VELORA is a static fictional architecture portfolio: browser -> validated scene/light query state -> rendered scene and text -> local original SVG design-card download. No server, identity, payment, booking or database is required. Local code and performance review is complete. Public deployment and live browser evidence are the integrator's separate release gate.

## Source findings and disposition

| Severity | Finding | Location when reported | Disposition |
| --- | --- | --- | --- |
| P2 | Morning and midday used identical fallback artwork palettes, so a no-WebGL visitor saw no visual time change. | `src/ArchitectureArt.tsx:9` | Art developer corrected the midday palette and reflection geometry; browser regression pending. |
| P2 | A rejected lazy scene chunk had only Suspense, which handles loading, not rejection. Interrupted asset delivery could remove the entire React app. | `src/App.tsx:67` | Integrator added a scene-scoped error boundary. Source confirmed; independent browser QA passed interrupted-chunk regression. |
| P3 | A scene props-object effect reapplied lighting and shadow rendering on unrelated parent renders. | `src/Scene.tsx:86` | Art developer changed dependencies to primitive values. |
| P3 | The context-loss handler canceled animation, but control/resize updates could schedule it again while the WebGL context remained lost. | `src/Scene.tsx:249` | Art developer added a lost-context guard and restoration reapplication. |
| P3 | Entering a collection card scrolls to the explorer while keyboard focus remains on the collection card below the viewport. | `src/App.tsx:31` | Integrator added focus transfer to the selected explorer button; source confirmed. |
| P3 | The removed `PCFSoftShadowMap` constant emits a browser warning and falls back to `PCFShadowMap` in the installed Three.js version. | `src/Scene.tsx:107` | RESOLVED in source: integrator changed to supported `THREE.PCFShadowMap`, preserving the already-effective behavior. The raw performance capture honestly retains the pre-fix warning; removal must be verified in final live browser logs. |

Line references describe the inspected version and may move after fixes. The reviewer does not silently modify implementation files.

## Verified source and tool checks

- Query values are allowlisted to three spaces and three times. Invalid and script-like values normalize to real defaults. `useExperience` preserves unrelated query parameters and hash anchors; one popstate listener is cleaned up; a synchronous ref composes rapid choices before React renders.
- SVG export normalizes runtime input, escapes text, and uses original inline paths. No script, foreign-object, event attributes, external image URLs, or HTML injection sink is required. Blob URLs are revoked after download initiation. No credentials, analytics, identity, payment or backend calls were found in the inspected application source.
- Three.js loads as a separate chunk. Pixel ratio is capped at 1.5; render calls are capped near 30 fps by source. The source loop does not continuously reschedule after pause/reduced motion, and intersection/visibility changes cancel background work. Actual runtime quiescence passed below.
- Scene cleanup disconnects observers, removes listeners, cancels animation, disposes unique geometry/materials and texture, and disposes/loses/removes the renderer. Geometry for all spaces is created once and selected by visibility, avoiding reallocation on scene changes.
- Independent `npm run test:unit`: 6 passed, 0 failed. Independent `npm run lint`: passed at the inspected version.
- `npm audit --json`: exit 0, no known advisories reported. Evidence: [dependency-audit.json](dependency-audit.json). npm received the dependency tree, not application source or credentials. This is a point-in-time advisory check, not proof of complete security.
- Font package license files independently confirm Cormorant Garamond and DM Sans use SIL OFL 1.1. Fonts are self-hosted. The three measured navigations requested only the site origin; no third-party trackers, CDNs, media or APIs were observed.
- Release source review: GitHub Actions uses one browser worker and preinstalled Chrome, with no apt dependency installation. Only the deploy job receives Pages/OIDC write permissions. Pre-deploy tests gate publication; a live job repeats the complete browser suite. The exact-SHA verifier now compares remote commit, entry HTML, favicon, and every built asset hash against the local build. These are source observations; actual CI success is the integrator's release evidence.

## Measured local build

Evidence: [performance-local.json](performance-local.json), produced by `node scripts/audit.mjs --label local --runs 3 --lifecycle`. Conditions: installed Chromium 156.0.8078.4, Playwright 1.64.1, Windows, headless, viewport 1440 x 1000, DPR 1, CDP 4x CPU slowdown, unthrottled network, fresh browser context/cache for each of three sequential trials. No other VELORA browser audit ran concurrently; unrelated host workload was not controlled. Each navigation was observed for 3 seconds after network idle.

| Metric | Trial 1 | Trial 2 | Trial 3 | Interpretation |
| --- | --- | --- | --- | --- |
| FCP | 1124 ms | 1076 ms | 888 ms | Median 1076 ms |
| Observed LCP | 1124 ms | 1076 ms | 888 ms | The H1, not the WebGL canvas |
| WebGL ready | 2011 ms | 1834 ms | 1560 ms | DOM reports the first rendered scene ready; median 1834 ms |
| CLS | 0.00652 | 0.00652 | 0.00652 | Small local font/layout shift |
| Resource transfer | 291194 B | 291194 B | 291194 B | ResourceTiming transfer bytes, excludes entry-document navigation |
| JS heap used | 6691732 B | 7063576 B | 6864544 B | Point-in-time CDP heap, not a leak proof |
| Long tasks | 3 | 3 | 3 | Largest startup tasks 721 / 461 / 425 ms at 4x CPU slowdown |

Every trial rendered WebGL and recorded zero page exceptions, failed requests, or HTTP errors. One obsolete shadow-map warning per navigation was identified and reported for correction. These synthetic observations do not establish field Core Web Vitals, real-device GPU frame rate, INP, or battery behavior. The cold scene initialization still produces a main-thread long task on this throttled setup; no improvement is claimed without a comparable before/after experiment.

Runtime lifecycle was measured with injected counting of actual `requestAnimationFrame` callbacks. After a 500 ms settling period, each state was observed for 1000 ms: active 146 callbacks; user paused 0; scrolled offscreen 0; system reduced motion 0. PASS: continuous callbacks stop in all three quiet states. The active callback count is not a GPU FPS measurement; drawing itself is separately capped by the implementation.

## Remaining limits

- Physical mobile/Safari/Firefox, field INP, battery and GPU power measurements were not run by this reviewer.
- This is a focused static-app source/advisory review, not penetration testing or a claim of complete security.
- Production navigation, exact release SHA/hash results and public CI must be assessed from separate post-publication evidence. Local results are never substituted for live results.

## Reproducible performance check

Run `node scripts/audit.mjs --label local` against a built preview at `http://127.0.0.1:4317/velora-atelier/`. A separate isolated browser process/context is used. The script records browser version, platform, viewport, CPU/network/cache settings and three sequential samples. It collects navigation/paint timing, observed LCP and CLS, long tasks, heap metrics, actual resource bytes and browser/network errors. These are synthetic lab observations, not field Core Web Vitals.

Production must be tested separately with `node scripts/audit.mjs --url https://seoshiro.github.io/velora-atelier/ --label production`. Source/CI review and actual measured results will be recorded after implementation is available.
