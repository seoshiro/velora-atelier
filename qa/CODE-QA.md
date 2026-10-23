# Independent code, performance and security QA

Reviewer role: independent code/performance/security agent, separate from implementation. This is an ECC-derived instruction workflow; no ECC runtime or hooks were installed or claimed.

## Scope and status

VELORA is a static fictional architecture portfolio: browser -> validated scene/light query state -> rendered scene and text -> local original SVG design-card download. No server, identity, payment, booking or database is required. Local code review and the separate local and production performance audits are complete. The integrator retains the public CI and exact-release gate, supported by separate live browser evidence.

## Source findings and disposition

| Severity | Finding | Location when reported | Disposition |
| --- | --- | --- | --- |
| P2 | Morning and midday used identical fallback artwork palettes, so a no-WebGL visitor saw no visual time change. | `src/ArchitectureArt.tsx:9` | Art developer corrected the midday palette and reflection geometry; browser regression pending. |
| P2 | A rejected lazy scene chunk had only Suspense, which handles loading, not rejection. Interrupted asset delivery could remove the entire React app. | `src/App.tsx:67` | Integrator added a scene-scoped error boundary. Source confirmed; independent browser QA passed interrupted-chunk regression. |
| P3 | A scene props-object effect reapplied lighting and shadow rendering on unrelated parent renders. | `src/Scene.tsx:86` | Art developer changed dependencies to primitive values. |
| P3 | The context-loss handler canceled animation, but control/resize updates could schedule it again while the WebGL context remained lost. | `src/Scene.tsx:249` | Art developer added a lost-context guard and restoration reapplication. |
| P3 | Entering a collection card scrolls to the explorer while keyboard focus remains on the collection card below the viewport. | `src/App.tsx:31` | Integrator added focus transfer to the selected explorer button; source confirmed. |
| P3 | The removed `PCFSoftShadowMap` constant emits a browser warning and falls back to `PCFShadowMap` in the installed Three.js version. | `src/Scene.tsx:107` | RESOLVED: integrator changed to supported `THREE.PCFShadowMap`, preserving the already-effective behavior. The raw local capture retains the pre-fix warning. All three separate Windows production trials recorded zero warnings/errors, confirming removal there. Linux CI's separate ANGLE diagnostic is disclosed below. |

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

Runtime lifecycle was measured with injected counting of actual `requestAnimationFrame` callbacks. The lifecycle branch uses separate fresh contexts at default CPU speed (1x), unlike the three 4x-throttled navigation trials. After a 500 ms settling period, each state was observed for 1000 ms: active 146 callbacks; user paused 0; scrolled offscreen 0; system reduced motion 0. PASS: continuous callbacks stop in all three quiet states. The active callback count is not a GPU FPS measurement; drawing itself is separately capped by the implementation.

## Separate production performance audit

Audited URL: `https://seoshiro.github.io/velora-atelier/`. Audited release: `f1ba687997ce107dfa664dbe6fa7eb051559f8e6`. The separate [release verifier evidence](release-verification.json) records the exact commit plus matching entry HTML, favicon and 12 asset SHA-256 hashes. Production measurements started at `2026-10-23T22:42:41.419Z`, after independent visual/browser QA closed its browser. No other local browser audit ran concurrently.

Evidence: [performance-production.json](performance-production.json), generated once with `node scripts/audit.mjs --url https://seoshiro.github.io/velora-atelier/ --label production --runs 3 --lifecycle`. Three sequential isolated contexts used Chromium 156.0.8078.4, Playwright 1.64.1, Windows, headless, 1440 x 1000, DPR 1, CDP 4x CPU slowdown, unthrottled network, fresh context/cache, and a 3-second observation after network idle. The browser was closed when the script completed.

| Metric | Trial 1 | Trial 2 | Trial 3 | Interpretation |
| --- | --- | --- | --- | --- |
| FCP | 1412 ms | 1240 ms | 1220 ms | Median 1240 ms |
| Observed LCP | 1412 ms | 1240 ms | 1220 ms | H1 text, not the WebGL canvas |
| WebGL ready | 2183 ms | 1839 ms | 1823 ms | Median 1839 ms |
| CLS | 0.00652 | 0.00652 | 0.00652 | Small font/layout shift |
| Resource transfer | 292316 B | 292316 B | 292316 B | 8 resource requests per trial; entry document adds 714 B |
| JS heap used | 7290712 B | 7096868 B | 6687120 B | Point-in-time CDP measurement |
| Long tasks | 4 | 4 | 4 | Largest startup tasks 651 / 375 / 344 ms at 4x CPU slowdown |

PASS for the observed production navigation boundaries: all three trials reached the actual WebGL renderer, and raw captured console warning/error lists, page-exception lists, failed-request lists and HTTP-error lists were empty. Every recorded resource came from `https://seoshiro.github.io`; no third-party request was observed. This strict Windows production console result does not erase or contradict the separate retained Linux Chrome 155 CI graphics diagnostic below.

Production lifecycle, measured separately at default CPU speed (1x), used the same 500 ms settle and 1000 ms observation as the local lifecycle check: active 145 RAF callbacks; paused 0; offscreen 0; system reduced motion 0. PASS: callback quiescence held on the public site. RAF callback counts do not establish GPU FPS.

The cold scene initialization still incurs a 344-651 ms main-thread long task under this 4x CPU setup. These are synthetic lab observations, not field Core Web Vitals, mobile battery/GPU measurements or measured INP. No speed improvement is claimed by comparing different local and public network origins. No extra production performance runs or product changes were made to improve the reported samples.

## Remaining limits

- Physical mobile/Safari/Firefox, field INP, battery and GPU power measurements were not run by this reviewer.
- This is a focused static-app source/advisory review, not penetration testing or a claim of complete security.
- Public CI completion and the final documentation revision remain the integrator's release gate. The production audit above is separate from local results and tied to its recorded audited release; later documentation-only commits do not retroactively change that provenance.

## Independent disposition: Linux CI Chrome/ANGLE readback diagnostic

Reviewed against application revision `a018c1b0cdfb1729f0ef9929f35e4addefd9578e` and the proposed test-only classification. Application code remained frozen during this disposition. No browser process or large artifact download was needed for this review.

The [failed CI log, run 40033573813](https://github.com/seoshiro/velora-atelier/actions/runs/40033573813) was independently read. Ubuntu CI used Google Chrome 155.0.8059.39 and one worker. The first story completed every scene/time selection, interrupted choices and SVG download assertion, then failed its final empty-console assertion because of four matching driver performance warnings. The other eight stories passed, including actual WebGL context loss/restoration, nine distinct scene screenshots, and accessibility across four layouts. This failed run remains a failure; a later corrected run must supply the release pass.

The exact diagnostic is emitted in [ANGLE's primary Vulkan image-readback source](https://github.com/google/angle/blob/main/src/libANGLE/renderer/vulkan/vk_helpers.cpp): `ImageHelper::readPixelsImpl` emits `GPU stall due to ReadPixels` as a high-severity performance warning before a synchronous graphics completion with the `GLReadPixels` submission reason. It indicates an actual readback synchronization cost, not a JavaScript exception or a rendering-correctness verdict. This source establishes the diagnostic's graphics-layer meaning; it does not identify the precise caller on this runner.

The authored VELORA application source has no `readPixels`, `readRenderTargetPixels`, screenshot or canvas-export call. The normal browser story deliberately retains three real scene PNG captures. Those captures are a concrete pixel-readback path and a plausible trigger. Disabling optional trace screenshots did not eliminate the warning, so instrumentation as the sole cause is not proven. We do not classify it as cost-free or claim that the console had zero warnings.

Disposition: a narrowly retained, non-blocking browser/driver performance diagnostic is justified for this observed Linux CI Chrome environment. No functional or security product defect is established by these four messages while all user-flow assertions pass. The graphics performance observation remains disclosed, and does not replace the separate production performance measurement.

The reviewed policy in `tests/consolePolicy.ts` permits only console type `warning`, Linux CI, Chromium engine with the Chrome channel, actual browser version matching major 155 with a complete numeric version, and the complete anchored diagnostic including a hexadecimal WebGL identifier and only the exact optional final-repetition suffix. A different future Chrome major returns to strict failure rather than silently inheriting the exception. CR/LF, extra text, different operations/severities, every console error, and unknown warnings are rejected. The normal story bounds these classified entries to four. Raw message text, type, location, browser version, platform/channel, GL vendor/renderer/version and failures are written in a JSON evidence file and a test attachment in `finally`; classification does not erase the evidence. Page exceptions, request failures and HTTP failures still fail the strict normal story, and none of the nine scenarios or its screenshots was removed.

Independent policy tests: `node --test tests/consolePolicy.unit.ts` passed 3/3. These prove the policy's positive and negative cases, not the status of the upcoming CI run. Source review found no need to modify frozen product code solely to hide this browser diagnostic.

Integrator release evidence: [CI 40034679949](https://github.com/seoshiro/velora-atelier/actions/runs/40034679949) completed successfully, including 9/9 pre-deploy stories, deployment and 9/9 public-site stories. [Actual CI diagnostics](ci-production-console-diagnostics.json) identify Linux Chrome 155 with SwiftShader, four retained driver messages and zero strict failures. [CI file hashes](ci-release-verification.json) and [independent public file hashes](release-verification.json) agree on the source commit and all 14 served files. This does not change the independent review's diagnostic cost or synthetic-performance limits.

## Reproducible performance check

Run `node scripts/audit.mjs --label local` against a built preview at `http://127.0.0.1:4317/velora-atelier/`. A separate isolated browser process/context is used. The script records browser version, platform, viewport, CPU/network/cache settings and three sequential samples. It collects navigation/paint timing, observed LCP and CLS, long tasks, heap metrics, actual resource bytes and browser/network errors. These are synthetic lab observations, not field Core Web Vitals.

Production must be tested separately with `node scripts/audit.mjs --url https://seoshiro.github.io/velora-atelier/ --label production`. Source/CI review and actual measured results will be recorded after implementation is available.
