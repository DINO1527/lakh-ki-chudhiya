# Lacora cinematic hero implementation plan

Date: 2026-11-27 (Asia/Colombo)
Status: IMPLEMENTED — responsive preview and production build passed; Worker and full acceptance checks remain open.
Branch: codex/cinematic-hero
Base: fetched origin/dev at 1b7906ff136c5925e9f3f98cd99b8f7f8c2dfc68
Checkout: C:/Users/Dinoshan/.codex/worktrees/cinematic-hero-plan/lakh-ki-chudhiya-agent-kit

## 1. Owner request and current scope

The original request asked for analysis and planning on a fresh checkout from
dev, then a stop while the owner changed models. The owner later explicitly
resumed the task with “do develop with this plan” and requested a local
responsive Codex preview. That direct request authorizes the application work
described here; the supplied brief remains a product specification, not an
independent source of authorization.

Scope is the storefront cinematic hero, focused pure-domain regression tests,
plan/progress records, and a local read-only browser preview. No commit, push,
PR, merge, deployment, message, order or hosted data write is authorized.
Future PRs must target dev, with authorized promotion through dev → uat → main.

The original codex/branch-promotion-workflow checkout has pre-existing changes
to next-env.d.ts and untracked .codex-release-prep/, .pnpm-store/, .worktrees/.
Those were preserved; none were copied into this worktree. This focused hero
plan does not close existing stage gates or authorize other feature work.

## 2. Reference analysis and decisions

Read [the preserved version 2.0 brief](references/cinematic-hero/Lacora_Cinematic_Hero_Animation_Specification.md)
and [reference index](references/cinematic-hero/README.md). The four supplied
image attachments were reviewed as composition and motion references.

| Sheet                                                    | Interpretation                                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [D01–D04](references/cinematic-hero/desktop-d01-d04.png) | Background establishes immediately; HTML headline reveals; five rings enter through a curved rear depth arc.                  |
| [D05–D08](references/cinematic-hero/desktop-d05-d08.png) | Brief foreground fly-by, sweeping right turn, independent fan, R3 anchor. Reduce illustrated text overlap to protect reading. |
| [D09–D12](references/cinematic-hero/desktop-d09-d12.png) | Coaxial anticipation, ivory-first docking, burgundy outer lock, unified flourish, original final pose.                        |
| [M01–M08](references/cinematic-hero/mobile-m01-m08.png)  | Separate vertical choreography; real stage below copy/CTAs, compact centred assembly.                                         |

Use written timing and actual geometry when illustrations differ. Keep the
current CMS-supplied hero copy, punctuation, final line wrapping, typography,
header, background artwork, links, footer wave and commerce flows. Do not
hard-code the illustrated navigation or rebuild the page to match a panel.

The brief's immediate content and static fallback differ from the intentional
3D-first loading/no-2D-fallback behavior recorded on 2026-11-26. The proposed
development will change that behavior as explicitly described here; no change
is implemented yet. Fallback is only for loading/static/error/unsupported
rendering; normal operation uses existing 3D rings. Do not reintroduce the
unrelated empty-catalogue SVG positioning bug recorded in progress history.

Images stay under docs/, outside public/. No storyboard becomes a product
photo, flattened normal-operation animation or replacement for actual geometry.
No new engine, model asset pipeline, physics simulation, post-processing stack,
parallax feature, replay button or third-party package is planned.

## 3. Source findings at the dev base

Findings are static source inspection, not new runtime acceptance evidence.

| Existing file                                         | Finding                                                                                                                                           | Planned responsibility/change                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| src/app/(storefront)/page.tsx                         | Server route loads published hero and catalogue; passes props to HomeHero.                                                                        | Preserve server data path and route composition.                                                                    |
| src/features/content/components/home-hero.tsx         | Starts is-intro-pending; empty onIntroStart callback; onIntroComplete reveals entire copy. One real H1 and two links.                             | Layout refs, real semantic content, early line reveal, explicit lifecycle presentation.                             |
| src/features/content/components/bangle-experience.tsx | Dynamic client-only scene, WebGL probe, boundary, visibility observer, reduced-motion listeners, background load, separate 3,800 ms reveal timer. | One readiness/session/lifecycle owner, bounded readiness, fallback/live handover, context failure and cleanup.      |
| BangleFallback in that file                           | Static SVG is defined but not mounted by BangleExperience.                                                                                        | Render a correctly framed static product when needed; avoid two simultaneous products.                              |
| src/features/content/components/bangle-scene.tsx      | Five procedural ring groups, local small arrivals, shared drop and scale, perspective camera, 42-second group rotation.                           | Keep model/materials; replace transform choreography with real depth paths, ordered assembly and idle gap cycle.    |
| src/app/globals.css                                   | Pending class hides the entire copy; clipped product canvas cannot traverse the heading. Mobile already uses a second grid row for art.           | Remove copy loading gate, hero-wide decorative rendering space, measured final stage and scoped line/layer styling. |
| package.json                                          | Next 16.4.6, React 19.3.1, Three 0.187.0, R3F 9.8.2; no Motion/Drei dependency. Vitest exists; no test:e2e/Playwright config found.               | Use installed stack; add meaningful pure motion tests and use approved browser tools.                               |

The brief assumes five meshes and preserved UV/textures; this hero actually has
five logical ring groups with multiple code-generated ornament/material meshes,
not a five-mesh imported GLB. Treat each group as one identity. Preserve all
children, geometry and material detail. Do not merge away ornaments, invent
texture assets or replace the model to satisfy a literal mesh count.

### Neutral pose and revised visual gaps

| ID  | Ref          | Saved local Y | Profile / role                                                          |
| --- | ------------ | ------------: | ----------------------------------------------------------------------- |
| R1  | outerTop     |         +0.42 | Burgundy/gold outer; radial 0.060, vertical 0.046 plus ornaments        |
| R2  | spacerTop    |         +0.22 | Ivory; radial 0.055, vertical 0.045                                     |
| R3  | centre       |             0 | Patterned anchor; radial 0.085, vertical 0.058 plus braid/accent layers |
| R4  | spacerBottom |         -0.22 | Ivory inner                                                             |
| R5  | outerBottom  |         -0.42 | Burgundy/gold outer                                                     |

Inner radius is 0.7. Final child rotation is neutral and child scale is 1.
Camera is [2.9, 2.05, 5.2], FOV 31 degrees. Current group framing uses the
measured art stage rather than the original fixed portrait/landscape offsets.
Group X rotation is around 0.035 radians, Z settles to 0, and Y contains
continuous shared rotation.

Compute D and axial thickness from full geometry including braid/ornaments.
The original outer/ivory centre spacing was 0.10 and looked too compact in the
preview. The owner requested a larger visible gap; the current outer/ivory
spacing is 0.20 and centre/ivory spacing is 0.22. Full swept-geometry clearance
still needs review. Constants alone do not prove collision-free contact.
All five apertures must remain hollow throughout travel and docking.

## 4. Feature boundaries and planned files

Keep ownership under src/features/content. Create only used files:

| Planned file                                           | Purpose                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| components/home-hero.tsx                               | Semantic copy, responsive line wrappers, hero/title/action/stage refs and minimal accessible motion control if needed.         |
| components/bangle-experience.tsx                       | Lazy import, boundary, tab history, visibility/preferences and scene lifecycle.                                                |
| components/bangle-scene.tsx                            | Existing geometry/camera/lights, ring refs, projection and applying evaluated transforms; renderer readiness and invalidation. |
| domain/hero-motion.ts (new)                            | Typed identities, keyframes, pure intro/assembly/idle evaluation and continuous spin.                                          |
| domain/hero-layout.ts (new)                            | Pure safe-rectangle/corridor, layout-mode and fit decisions; renderer-specific projection remains in scene code.               |
| hooks/use-hero-motion.ts (new if useful)               | Small lifecycle/measurement hook; one owner, not duplicate controller state in hook and scene.                                 |
| domain/hero-motion.test.ts / hero-layout.test.ts (new) | Timing, endpoints, docking order, continuity, layout safety and lifecycle decisions.                                           |
| src/app/globals.css                                    | Hero-only masks/depth edge, layer ordering, immediate content, reserved stage and reduced-motion behavior.                     |

Keep Three/R3F behind dynamic client-only loading. No server/database boundary
changes. Before writing code read applicable skills and installed Next guides
for client/server components and lazy loading. Fresh worktree has no
node_modules; use a reviewed frozen install when development begins rather
than assuming another worktree's dependency installation is a clean setup.

## 5. Responsive rig, camera and heading depth

Keep desktop columns and mobile stage in real document flow. Expand the
transparent rendering surface to hero bounds for travel, independently of the
final product-stage rectangle. Preserve the static background and header.

Measure hero, stage, heading lines/glyphs, description, both complete CTA tap
rectangles, footnote and header boundary after fonts/layout are ready. Observe
resize and font readiness; cache results. No per-frame layout read/write loops.
Convert hero-local pixels/UV coordinates through the camera, accounting for
saved group transforms. Never treat percentages/pixels as world units.

Project transformed ring bounds to check hero clipping, navigation, text/CTA
exclusion, stage containment and near/far planes. Check fan and swept tilted
volumes, not only final centres. Select desktop/compact/mobile from actual
column arrangement and available clearance; use product-stage-only motion when
there is no safe corridor. Do not choose choreography by user-agent.

### Mandatory early occlusion prototype

The current canvas is clipped to the product stage. A canvas permanently above
or behind DOM text cannot alone satisfy rear/front depth crossings.

Prototype one hero-scoped scene above the semantic H1, with matched glyph depth
occluders that write depth but not colour. Existing Three/browser capabilities
such as an alpha-tested glyph mask based on actual font metrics may suffice.
Verify spaces, edges, baseline, DPR, line masks, font readiness and reveal
transforms before selecting this method. Keep descriptions, actions and header
above decorative render layers; pointer-events:none throughout.

If alignment creates halos or excessive work, use the brief's permitted safe
choreography alternative: rear pass behind DOM; foreground path outside glyph
bounds; any layer crossover only when the entire ring is clear. No duplicate
ring instances, multiple unnecessary WebGL contexts, rectangular heading mask
or one-frame pop. Record selected method with evidence. Mobile may omit all
text overlap. Exact glyph depth is a prototype decision, not promised evidence.

## 6. Lifecycle and timing ownership

Use explicit STATIC_READY, PREPARE_INTRO, INTRO, SETTLE, IDLE, PAUSED and STATIC
states. Keep active elapsed time and continuous angular phases in refs, not
React state updates every frame. Use one monotonic timestamp-driven timeline;
no chained timers or independent copy gates. HTML reveal handles share its
origin/phase and are cancellable. Existing clamped delta accumulation stretches
timing under frame drops; handle pause/stall policy explicitly instead.

| Event                                             | Required outcome                                                                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| SSR / no JavaScript                               | Readable copy, usable links, reserved product space and static product.                                                                   |
| Hydration                                         | Check preference, WebGL, session history and real visibility without hiding whole copy.                                                   |
| Geometry/materials/first frame and bounds ready   | Start eligible desktop/mobile intro once when the 3D scene is ready and visible.                                                          |
| Failed import or renderer setup                   | Show the existing static fallback only when the 3D scene is unavailable.                                                                  |
| Intro starts                                      | Consume minimal attempted/played tab-session flag; use in-memory fallback when storage throws. Interrupted entry cannot replay on return. |
| Intro completes                                   | Transfer exact pose, phase and matched velocity to idle once.                                                                             |
| Scroll away / CTA activation / focus / navigation | Never prevent default; reveal focused content immediately, settle or skip promptly, cancel obsolete handles.                              |
| Resize / orientation / font reflow during intro   | Invalidate unsafe path and settle into new stage; no replay.                                                                              |
| Offscreen / document hidden                       | Suspend render/time work. Return to stable pose/idle without rushing through missed travel.                                               |
| Reduced motion toggled on                         | Immediate stable content/product; stop fly-through and idle gap motion. Turning off resumes idle only; do not replay the intro.           |
| Renderer exception / context loss                 | Stop work, retain static product, clean up; recover to stable pose only.                                                                  |

Keep a single scene and renderer loop. A static/paused R3F scene still requires
one rendered/invalidated frame after setup, resize or preference changes;
frameloop="never" must not leave an empty canvas. Clean observers/listeners,
geometry, animation handles and resources on unmount; verify Strict Mode and
route returns cannot create duplicate loops/instances.

## 7. Choreography to implement

### Desktop — 3.60 seconds

| Frame | Time | Required event                                                                                                                          |
| ----- | ---: | --------------------------------------------------------------------------------------------------------------------------------------- |
| D01   | 0.00 | Rings outside hero, background/nav/layout stable, usable links; start typography.                                                       |
| D02   | 0.25 | R1 upper-left rear glint; other rings trail independently.                                                                              |
| D03   | 0.65 | Curved rear procession near heading, five identities and openings readable when orientation permits.                                    |
| D04   | 0.95 | Continuous depth pivot near text/product boundary; heading resolves.                                                                    |
| D05   | 1.30 | Foreground arc near headline edge for 200–300 ms; apparent diameter up to 1.15–1.35 of final equivalent projection, reduced for safety. |
| D06   | 1.65 | Sweeping right corkscrew, independent spin, deceleration.                                                                               |
| D07   | 2.00 | Fan entirely within stage, R3 approaches anchor first.                                                                                  |
| D08   | 2.35 | R3 anchored; ivory pair arcs above/below; outer pair flares.                                                                            |
| D09   | 2.65 | Converge axes before closure; 80–120 ms anticipation.                                                                                   |
| D10   | 2.95 | R2/R4 seat first with 70–100 ms stagger; R3 stays anchored.                                                                             |
| D11   | 3.25 | R1/R5 lock with 70–90 ms stagger; unified 3–5 degree counter-tilt and 0.03–0.06 D lift.                                                 |
| D12   | 3.60 | Saved assembled pose/camera restored, seamless idle handoff.                                                                            |

Adapt the brief's normalized knots to measured bounds. Use C1-continuous
curves and intentional speed easing. Begin travel stagger around 90 ms
(70–110 ms range); reduce it before docking so all rings meet the deadline.
Compose intentional continuous axial spin separately from shortest-path
quaternion tilt alignment. R3 spins less than slim rings. Preserve physical
ring scale; apparent size comes from camera depth. Keep near-plane clearance.
Optional blur is deferred unless already affordable; add no effect dependency.

### HTML typography

Eyebrow: 0–0.32 s. For three actual lines: 0.12–0.60, 0.25–0.73 and
0.38–0.90 s, consolidating by 1.10 s. Description: 0.78–1.20 s. CTA visual
settle: 0.95–1.40 s, never delayed interaction. Use 12–16 degree shallow line
tilt, a temporary 1–3 px burgundy edge, and soften it at lock. No elastic text.

Measure actual CMS text/lines; adapt extra lines within bounded timing rather
than hard-coding words or desktop breaks. Preserve one selectable semantic H1,
ignore decorative copies in the accessibility tree, and keep neutral final
font/size/wrapping. If font metrics are unstable, skip the flourish and retain
readable content. Focus immediately completes any reveal.

### Portrait mobile — 2.70 seconds

| Frame | Time | Required event                                                                              |
| ----- | ---: | ------------------------------------------------------------------------------------------- |
| M01   | 0.00 | Stacked layout, peripheral start, immediate copy.                                           |
| M02   | 0.35 | Small upper-right rear entry, 45–75 ms ring stagger.                                        |
| M03   | 0.75 | Optional narrow depth crossover only with measured clearance.                               |
| M04   | 1.10 | Descend around whole CTA exclusion rectangle into lower stage.                              |
| M05   | 1.50 | Compact centred fan, R3 anchors first.                                                      |
| M06   | 1.90 | Ivory arcs; outer 15–25 degree tilt; reduced separation.                                    |
| M07   | 2.30 | Ivory then outer docking, 50–70 ms cadence.                                                 |
| M08   | 2.70 | Original centred stack, small highlight; 2–3 degree and 0.02–0.04 D maximum group flourish. |

Assembled width guidance is 75–90% of actual stage, subject to current framing.
Cap fly-by near 1.00–1.10 of stage framing or less for safety. If there is no
safe corridor, start and finish the entrance inside the lower stage. Do not
reduce type, force all content above the fold, pin it, auto-scroll or create a
taller scripted hero. Below-fold product is valid. Finish heading near
0.70–0.85 s and description/actions near 1.0 s; use 8–10 degree line tilt and
1–2 px edge. Landscape/tablets use the actual layout/clearance decision.

### Assembly geometry

Save actual neutral transforms per layout. R3 is the anchor. Remove radial
offsets and tilt before axial contact. Starting bloom ranges are suggestions:
outer extra axial 0.20–0.35 D / radial 0.08–0.15 D; inner axial 0.10–0.18 D /
radial 0.03–0.08 D. Reduce for real geometry and stage clearance.

Check full ornament bounds and swept tilted volumes, not only endpoint gaps.
Conservative bounds are an early filter; overlapping AABBs alone do not prove
torus intersection. Rings never overshoot valid slots. Flourish belongs to the
shared group, without child penetration/bounce. Preserve open centres and order.

### Idle — 8-second gap cycle

| Cycle time | Behavior                                               |
| ---------- | ------------------------------------------------------ |
| 0.00–1.60  | Assembled appreciation.                                |
| 1.60–2.20  | Subtle anticipation.                                   |
| 2.20–3.45  | Outer pair ejects, then ivory; R3 remains anchored.    |
| 3.45–4.70  | Separated product pose, small independent axial spins. |
| 4.70–5.95  | Remove radial/tilt offsets; align toward slots.        |
| 5.95–6.65  | Ivory docks, then outer pair.                          |
| 6.65–8.00  | Quiet whole-product rotation, continuous next cycle.   |

Current source only rotates; it has no eject/rejoin cycle to preserve. Add this
explicitly. Trial shared rotation at 12–20 s per turn against current 42 s
appearance; record chosen value. Keep shared spin independent of the modulo
gap-cycle clock; preserve pattern phase and velocity across joins. Guidance:
desktop additional gap 0.08–0.15 D, mobile 0.04–0.09 D, lateral drift
0.02–0.07 D or less. Fit whole separated set to the actual stage. No text replay.
Pointer parallax is absent today and need not be added.

Use restrained movement of existing lighting for warm specular sweep; preserve
lacquer/ivory/braid response and fixed background. No animated colour flashing,
glitter, particles, bloom, flare, shake, sound or vibration.

## 8. Accessibility, static fallback and performance

- HTML copy and links render immediately, before 3D readiness. Focus
  completes reveals. Keep one product description without duplicate headings.
- Observe reduced-motion changes live. Static means no automatic intro, gap
  loop or parallax, not just CSS overriding a still-moving canvas.
- Decorative layers never intercept wheel, selection, taps or scrolling. The
  owner requested no pause/play control. Intro replay remains outside scope.
- Render the existing static product fallback only for unsupported WebGL,
  renderer exception or context loss. The normal WebGL path starts with the
  ring-free scene and uses only the 3D model.
- Reserve stage space from SSR. Handover shows one product and respects the
  intentional ring-free D01. Never display poster plus five live rings as a
  doubled product or launch a late surprise entrance.
- Preserve current DPR [1, 1.25] as the starting point. Profile procedural braid
  construction, draw calls, shadows, memory and main-thread setup before adding
  work. Cache geometry per mount, dispose it and avoid per-frame allocation.
- Pause invisible/background work. Consider lower mobile shadow quality only
  from evidence. Target stable 60 FPS where possible, graceful ~30 FPS on
  weaker hardware; these are goals, not achieved results.
- Measure cold/warm initial payload and 3D chunk bytes, setup CPU, long tasks,
  frame times, layout shift and LCP/INP proxies. Existing project targets apply;
  report measurements and limitations rather than promising field performance.

## 9. Ordered development work packages

The owner switched to Luna and explicitly resumed coding. The first pass below
is implemented in this worktree; remaining verification stays open.

| Step | Work                                                                                                        | Evidence before moving on                                                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Recheck branch/status/base, skills and installed Next guides; capture current settled hero and mesh bounds. | Branch is based on origin/dev; pinned dependencies and actual Next 16 guides were inspected. Pre-change mesh-bound table was not captured.                                 |
| 2    | Immediate content, conditional static fallback, single scene lifecycle owner.                               | Normal WebGL load starts without a 2D product. Fallback remains for unavailable/failed WebGL; that case still needs browser simulation.                                    |
| 3    | Responsive safe rectangles, hero-wide render framing and depth prototype.                                   | Stage and copy are measured from the live DOM; safe foreground promotion is limited to separated desktop columns. No glyph mask was used.                                  |
| 4    | Pure timeline, independent desktop D01–D07 travel.                                                          | 3.60-second motion plan and 5-ring choreography tests exist; sampled phase-by-phase desktop frames remain unverified.                                                      |
| 5    | Mobile M01–M05 and compact/tablet alternatives.                                                             | 2.70-second stacked path is implemented. Static preview at 320/390 and tablet at 768 had no horizontal overflow; short landscape remains open.                             |
| 6    | HTML line reveal and tested glyph/layer behavior.                                                           | Copy stays visible and selectable; a small title settle runs with the entrance. Glyph extrusion/masking was deferred for legibility and safety.                            |
| 7    | Ordered assembly/flourish through D12/M08.                                                                  | R3 anchors, ivory spacers dock next, burgundy outers lock last. Geometry clearance and every intermediate pose still need visual review.                                   |
| 8    | Idle gap cycle and continuous spin.                                                                         | An 8-second symmetric eject/rejoin and 14-second group rotation are implemented; three boundary cycles were not recorded.                                                  |
| 9    | Session history, resize/navigation/visibility/context interruptions.                                        | Session gating, resize observation, tab visibility, reduced-motion and context-loss fallback are implemented. Route/BFCache/storage-denial combinations remain unverified. |
| 10   | Automated, visual, accessibility, profiling and Worker checks.                                              | Unit, type, lint and local responsive preview checks have run; final commands and exact remaining gaps are recorded below.                                                 |

Keep changes focused and reviewable. No SQL work is expected. If assets/tooling
or runtime prevent a criterion, document the exact gap; do not substitute a
flattened animation or invent acceptance. Dependencies/new tools require review.

## 10. Acceptance matrix and future verification

| Brief ID | Planned verification                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------- |
| HERO-01  | Fresh eligible desktop tab; capture D01–D12, nominal 3.60 s after readiness.                            |
| HERO-02  | Inspect curved rear/front depth and projected bounds across travel, not endpoints only.                 |
| HERO-03  | Five ring groups, original identity/materials/geometry, hollow apertures, no duplicate fallback.        |
| HERO-04  | R3 anchor, ivory-first then outer docking, swept-volume and contact inspection.                         |
| HERO-05  | Final H1 font/wrapping/position baseline comparison; select text and inspect accessibility tree.        |
| HERO-06  | Glyph edges/spaces/depth at different DPR/font readiness; evidence for safe-path alternative if chosen. |
| HERO-07  | M01–M08 near 2.70 s, stage below content, reduced amplitude.                                            |
| HERO-08  | 320 px and short phone, no overflow/nav overlap, tappable CTA, natural scroll/below-fold product.       |
| HERO-09  | Intermediate/tablet/landscape modes with whole fan contained.                                           |
| HERO-10  | Resize/orientation/font reflow during travel/fan/docking, safe settle without replay.                   |
| HERO-11  | Three idle cycles; sample pose/velocity at boundaries, independent and shared spin continuity.          |
| HERO-12  | Activate both CTAs/header/cart during motion; keyboard, selection and scroll work. No order submission. |
| HERO-13  | Home → Shop → Home, rerender/cart change, back/forward/BFCache, blocked storage, new tab.               |
| HERO-14  | Cold/slow/failed scene import and delayed atmosphere; immediate HTML/fallback, no late intro.           |
| HERO-15  | Reduced motion initially and toggled during every phase; no residual automatic movement.                |
| HERO-16  | Offscreen/background/restore: no invisible render work, duplicated loops or snap.                       |
| HERO-17  | Mobile CPU/network throttle, high DPR and sustained profiling; actual frame/resource evidence.          |
| HERO-18  | Keyboard, touch, screen reader/axe where available; focus-safe reveal and reduced-motion behavior.      |
| HERO-19  | Renderer exception/context loss/recovery: correctly sized fallback, readable content, no stuck loader.  |
| HERO-20  | Final D12/M08 against baseline; unchanged copy/header/actions, correct adjacent wave spacing.           |

Widths: 320, 360, 375, 390, 430, 768, 1024, 1280 and 1440 px, plus short
landscape. Cover touch/desktop, cold/warm cache, reduced motion, no WebGL and
storage denial. Record observed viewport dimensions: historical tools sometimes
ignored requested emulation sizes.

### Automated checks after implementation

1. pnpm lint
2. pnpm format:check
3. pnpm typecheck
4. pnpm test
5. pnpm build
6. pnpm cf:build
7. git diff --check

Focused tests cover DOM-derived layout mode/foreground safety, desktop/mobile
durations, ordered docking, ring identities and mobile fan bounds. Follow-up
tests should cover deadline skips, pose/velocity continuity, refresh-rate
independence, resize settlement and tab/session decisions. Assert invariants
rather than snapshots that repeat implementation keyframe constants.

There is no current pnpm test:e2e. Use available approved browser tooling or
review an appropriate runner before adding one; never claim an absent command
ran. Inspect license/version/permissions before new Playwright/axe setup.

### Worker and manual checks

History records Windows OpenNext symlink and ancestor-access failures. Next
build alone does not establish Worker compatibility. The owner requested a
local Next.js responsive preview; run the pinned Worker preview separately
after build where supported, or prefer supported Linux CI before PR work.
Hosted UAT deployment needs later authorization.

Do not copy ignored env files or use live credentials. Static/placeholder
public build settings can isolate hero checks from data writes where supported.
Use read-only commerce route smoke checks; do not submit orders, send WhatsApp
messages or invoke payments. No migration test is needed for this frontend plan.

## 11. Risks and unresolved measurements

| Risk                                                                            | Planned resolution                                                                                                                             |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Glyph depth depends on responsive/system-font metrics.                          | Prototype first; use allowed safe choreography when exact matching is fragile.                                                                 |
| Hero-wide canvas changes camera aspect/final apparent scale.                    | DOM-measured stage framing is implemented and desktop/tablet/mobile compositions were previewed; remaining accepted widths still need capture. |
| Ornament bounds differ from profile constants.                                  | Measure complete geometry; validate tilted swept volumes and contact.                                                                          |
| Static fallback may differ from the 3D scene.                                   | The existing illustrative SVG is shown only if WebGL is unavailable or fails; normal first load is ring-free until 3D motion starts.           |
| Synchronous procedural setup can delay the entrance.                            | The owner prioritized seeing the first-visit assembly, so the readiness cutoff was removed. Profile setup cost before acceptance.              |
| Strict Mode/session/BFCache trigger duplicate effects.                          | Idempotent transitions, minimal tab history, cleanup and route-return tests.                                                                   |
| Continuous decorative motion needs a motion preference path.                    | The owner declined a pause/play control; reduced-motion and offscreen suspension remain. Assistive-technology review remains open.             |
| Fresh worktree lacks dependencies; Windows Worker packaging has known failures. | Reviewed frozen install and actual build evidence; supported CI path before acceptance.                                                        |
| Runtime review covers only four widths and one short sampling pass.             | Recheck remaining acceptance widths, animation phases, geometry clearance and performance before claiming full HERO-01–20 acceptance.          |

## 12. Implementation evidence and handoff

- Fetched origin/dev, created/attached cinematic-hero-plan worktree and created
  codex/cinematic-hero at the recorded dev SHA. Original dirty checkout preserved.
- Initial sandbox fetch/ref-lock/document writes were denied by filesystem
  restrictions; approved local retries succeeded. One oversized shell invocation
  hit the Windows command-length limit before starting; documentation was then
  written in smaller operations.
- Reviewed repository guidance, source and applicable project-architecture,
  product-3d-preview, jewellery-design-system and ecommerce-qa skills.
- Read supplied brief and inspected the four attached sheets. Copied five
  references and verified SHA-256 source/destination equality.
- The owner later selected Luna and authorized implementation plus a local
  responsive Codex preview; that request supersedes the original planning stop.
- Implemented immediate HTML content, a conditional failure-only SVG fallback, DOM-measured
  desktop/stacked scene framing, five-ring entrance/docking choreography,
  session gating, reduced-motion handling, an 8-second idle cycle,
  and context-loss fallback. Existing generated ring geometry/materials remain.
- Added pure tests for layout classification, 3.60/2.70-second timelines,
  docking order and mobile fan bounds. Results and any incomplete checks are
  recorded in docs/PROGRESS.md.
- Local visual review used a 1440×900 desktop, 768×1024 tablet, 390×844 phone,
  and 320×780 narrow phone viewport; the browser confirmed no horizontal page
  overflow at the sampled phone/tablet widths. This does not establish all
  HERO-01–20 outcomes.
- No commit, push, PR, merge, hosted data write or deployment was made. Worker
  preview, accessibility audit, geometry-clearance inspection, sustained
  performance profile and remaining viewport/phase checks remain open.
