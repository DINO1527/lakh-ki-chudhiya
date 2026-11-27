# LACORA — Cinematic 3D Hero Animation
## Responsive motion-design and implementation specification

**Purpose:** Implementation brief for the development agent
**Version:** 2.0 — enhanced cinematic entrance, dimensional typography, magnetic assembly and responsive mobile choreography
**Scope:** Enhance the existing homepage hero, its existing five independent 3D bangle meshes, heading animation and subsequent idle animation. Preserve the current brand, content, navigation, CTA actions, background artwork and commerce functionality.

---

## 1. Creative direction

### Concept: “The Lacora Orbital Reveal”

The five handcrafted bangles make a coordinated entrance like a luxury jewellery campaign. They should enter individually, travel through a curved three-dimensional path, pass behind and briefly in front of the headline, and sweep into the right-hand product stage. They then perform a carefully synchronized **magnetic assembly** around the wide patterned centre bangle. The finished stack is presented with a soft light sweep and a restrained settling motion before seamlessly beginning the existing slow rotation and eject/rejoin effect.

This is not an ordinary slider, flat left-to-right transition, spinning loading screen or game-like explosion. The movement should feel sophisticated, weighty, intentional and physically plausible. The choreography combines fast expressive travel, slower product appreciation and a satisfying final alignment.

### Motion principles

1. **Anticipation → acceleration → depth fly-by → deceleration → assembly → release.**
2. Each ring is a real, independent 3D object; motion arises from changes in world position and orientation rather than fake 2D translation or stretching.
3. Use an S-shaped/corkscrew trajectory with clearly visible front/back depth changes. Rings share a choreographed direction but have individual phase, tilt, spin and timing.
4. Give the central patterned ring more visual weight and slightly less angular speed; it anchors the assembly.
5. Movement is dramatic during entry and calm after landing. Avoid constant high-energy motion.
6. Preserve the actual Lacora visual language: ivory typography, burgundy silk, champagne satin, gold accents and glossy lacquer.
7. The navigation must remain stable and usable. The product animation and typography must never block browsing or purchasing.
8. Mobile must use its own vertical choreography, not a scaled-down desktop animation.

### Visual references

Use the generated storyboard sheets accompanying this brief as **composition and motion concept references**:

- Desktop sheet 1: D01–D04 — anticipation, typography reveal and rear orbital entry.
- Desktop sheet 2: D05–D08 — foreground fly-by, right-hand turn and assembly formation.
- Desktop sheet 3: D09–D12 — magnetic alignment, docking, highlight sweep and final product lock.
- Mobile sheet: M01–M08 — responsive top-to-bottom entrance and centered assembly below the content.

The illustrations are still-frame artistic approximations, not source assets, exact geometry, final UI screenshots or an exact simulation. The numerical timeline, safety zones, mesh identities and final layout defined in this specification take precedence if any storyboard panel differs.

---

## 2. Existing hero and non-negotiable visual invariants

### Desktop

- Keep the existing two-column composition: heading/content and CTAs on the left, large 3D bangle product on the right.
- Preserve the existing silk/champagne background; keep it pinned to the hero instead of moving the whole page with the product.
- Keep the top navigation at its current size and location.
- Keep the hero's existing typography, copy, colour scheme and buttons:

> LACORA · HANDCRAFTED LAC BANGLES
> Colour with a story of its own.
> A romance in the circles. Discover the warmth, colour and detail of handcrafted lac bangles by Lacora.
> Explore the collection
> Our craftsmanship

Use the actual existing text from the application if punctuation or line breaks differ. Do not rewrite or duplicate the content.

### Mobile and portrait tablet

- Stack content naturally: eyebrow, heading, description, CTA(s), then dedicated 3D product stage below.
- Align the final bangle stack to the horizontal centre of that lower stage. The stage has its own height and occupies real layout space; do not absolutely position the final product over the copy.
- Preserve readability and scrolling on small-height devices; it is acceptable for part of the product stage to be below the first viewport.
- Do not force all content above the fold by reducing type or altering the normal responsive layout.
- Maintain existing compact responsive navigation. The animation must not introduce a new menu system.
- Preserve all click targets. No horizontal page overflow, clipped navigation, hidden CTA or layout jump.

### Bangle identity and assembly order

The original meshes, materials, UVs and textures are the source of truth.

| ID | Position in assembled set, top to bottom | Design | Role in choreography |
|---|---|---|---|
| R1 | Top | Slim burgundy lacquer with interwoven gold detailing | Leading ring; final upper outer lock |
| R2 | Second | Slim ivory lacquer | First upper inner ring to dock |
| R3 | Centre | Wider, richly patterned burgundy/red/gold handcrafted ring | Visual and mechanical anchor |
| R4 | Fourth | Slim ivory lacquer | First lower inner ring to dock |
| R5 | Bottom | Slim burgundy lacquer with interwoven gold detailing | Final lower outer lock |

- Exactly five rings at all times. No cloning, substitution, disappearing after docking, texture changes or artificially added jewellery.
- Preserve each original ring's diameter, thickness and proportions.
- All five rings must have a truly hollow circular centre. Never fill the hole with a flat disc, solid centre or overlapping accidental geometry.
- During assembly, do not merge or boolean-union the meshes. They remain independently controllable.
- Inspect the current meshes and preserve their established neutral transforms and actual final stacking offsets. Numeric examples below are design parameters, not replacements for the real measured mesh geometry.

---

## 3. Motion-space, camera and animation rig

### Coordinate convention

Use the existing 3D engine and adapt its coordinate convention internally. For this brief:

- **X**: screen-horizontal; positive is right.
- **Y**: vertical world axis; positive is up.
- **Z**: depth; positive means nearer to the camera.
- **U, V**: normalized hero-local screen coordinates used to specify visual target positions. U = 0 at left, U = 1 at right; V = 0 at top, V = 1 at bottom.
- **D**: actual nominal outer diameter of the original bangle set, measured in world units. Individual ring bounds may differ slightly.
- **A**: the established neutral stacked pose, including the existing final shared orientation and ring offsets.
- **P**: final product-stage center projected into screen space; calculate from the actual responsive DOM product-stage rectangle, not a hard-coded window coordinate.

Use hero-local responsive coordinates and unproject targets through the camera as appropriate. Never equate pixels or normalized percentages directly to world-space units.

### Rigging requirements

- A product group controls the shared translation, overall orientation and idle rotation.
- Five child mesh transforms control individual position, local spin, tilt and assembly offsets independently.
- If an existing ring origin is wrong, use a correctly centred pivot parent rather than modifying the geometry.
- Use a per-ring pivot at the centre of its hollow aperture; no orbiting around an accidental global origin.
- Preserve the final pose A as a stable reference; reset to it at completion, not to newly guessed offsets.
- Rotate each bangle about its own normal for lacquer-detail rotation, and tilt about perpendicular axes to expose its depth and inner opening.
- Use quaternion interpolation or an equivalent shortest-path rotation method for alignment. Intentional spin should be tracked as a separate continuous angle, not a quaternion shortcut that removes a full turn.
- Drive all transforms from one monotonic timeline. Do not chain unsynchronized independent timers.

### Camera and perspective

- Prefer the existing perspective camera and existing lighting; do not redesign the scene.
- Set a stable camera and animate the rings rather than moving the actual hero or header.
- Optional, very subtle camera dolly during the D05 fly-by: no more than a small change needed for framing, and restore the original camera before D12. Prefer ring depth travel alone.
- Make depth visible through perspective, occlusion, foreshortening and specular response. A ring nearer the camera appears bigger because of its Z, not because its mesh physically grows.
- At the dramatic desktop foreground moment, projected diameter can reach approximately **115–135% of the final equivalent projected diameter**; cap actual projected bounds to protect content. On mobile cap at approximately 100–110% of the product-stage framing, or less if required for safe clearance.
- Use a narrow/moderate perspective consistent with luxury product photography, not extreme wide-angle distortion. Preserve the current final perspective.
- Maintain appropriate near/far clipping planes for the entire path, including off-stage starting poses. Avoid letting a ring pass through the camera or clip the near plane.
- Limit fast spin to a tasteful physical effect; a front-facing ring hole should be clearly visible during the reveal.

### Pivot and final offsets

Calculate the real axial thicknesses t1…t5 from each mesh's bounds along its stacking axis. Let c be the intended contact clearance, normally small enough to visually match the current stacked product. For adjacent rings, the required centre spacing is at least (tA + tB) / 2 + c. Use the existing stack's verified offsets whenever they are valid. Avoid interpenetration during contact or idle return.

At D12 / M08:

- All ring axes match the original shared axis.
- Each ring centre lands on its saved target offset.
- No residual positional drift, scale change, unwanted tilt or rotation discontinuity.
- Angular spin may retain its continuous phase if visually equivalent, so the idle animation starts without snapping.

---

## 4. Desktop entrance — detailed 12-keyframe timeline

**Nominal duration:** 3.60 seconds after the hero animation becomes ready. The table describes the visual lead/front group; individual rings use 70–110 ms of phase offset where appropriate. All five must finish at the specified assembly deadline, so progressively reduce phase offsets as docking begins.

**Target travel:** left peripheral entry → rear arc behind text → front arc beside headline → sweeping right turn → diagonal fan → central anchor → ordered axial docking → final lock.

| Frame and time | Ring state, trajectory and orientation | Headline/UI state | Transition to next stage |
|---|---|---|---|
| **D01 • 0.00s — Establish** | Backdrop instantly visible, no rings in the hero frame. R1 starts outside upper-left; R2–R5 trail along the approach path. All meshes loaded, no duplicate poster visible once live animation begins. | Header, hero layout and CTA hit targets are ready. Eyebrow begins a dim-to-bright reveal. Heading reserve space is already present. | Short anticipation, then accelerate. Do not delay the page behind a black screen. |
| **D02 • 0.25s — First glint** | R1 enters near U=-0.06 to 0.12, V=0.10–0.25, oriented 50–75° from its intended settled view. Other rings trail as a string of separate objects with proportionate spacing. Start farther away in Z for smaller apparent scale; initial angular motion is fast but controlled. | First headline line rises through its mask and rotates subtly toward the reader; eyebrow resolves. | Momentum builds into the rear path, no abrupt directional cut. |
| **D03 • 0.65s — Rear orbital trail** | Five rings now follow an elegant curved line through U=0.08–0.43, generally behind the headline plane. R3 is identifiable in the middle. The ring openings flash into view as each spins. The leading ring traces the first curvature while trailing rings are delayed. | Second and third text lines reveal with a short 100–140 ms stagger. Rings behind text are correctly hidden by visible letter shapes, not by an opaque rectangle. | Sweep along a continuous spline toward the boundary between content and product. |
| **D04 • 0.95s — Depth pivot** | Lead ring approaches U≈0.40–0.53; its Z rises from behind text toward the camera. Trailing rings occupy staggered depths, positions and tilts. The path bends into a gentle arc from left-centre toward the right. | Headline becomes fully readable and almost flat to camera; shallow burgundy dimensional edge is visible. Description begins/continues reveal. | Increase angular energy toward the foreground climax, but maintain ring clearance. |
| **D05 • 1.30s — Cinematic foreground fly-by** | Most expressive frame. R1 curves close to the camera near U≈0.47–0.60 and V≈0.35–0.58, temporarily appearing up to 1.15–1.35× larger than its equivalent final projection. R2/R3/R4/R5 form a receding perspective trail. Allow only a small edge of one or two headline glyphs to be occluded for a very short interval. Avoid all CTA bounds. | Headline has neutral readable front face. Description is visible, CTA(s) resolve; text no longer moves significantly. | Ease the lead ring's Z back toward the product depth; never cut instantly. The fly-by should last roughly 200–300 ms. |
| **D06 • 1.65s — Right-hand corkscrew** | Rings swing toward U≈0.62–0.88 and V≈0.30–0.65. R1 curves away from the viewer; all five demonstrate different rotational phases while remaining separated. A change in tilt exposes inner openings and patterned surfaces. | Text and CTAs remain stable. No second headline fade or screen shake. | Decelerate the horizontal travel and begin orienting the group toward the final product axis. |
| **D07 • 2.00s — Sculptural fan** | Rings gather entirely within the right product stage in an oblique diagonal fan. R3 approaches P first and slows. R1/R5 flare outward in opposite directions; R2/R4 pass nearer to R3. As they reorient, keep radial and axial separation so tilted volumes cannot cross. | All UI fully stable. Product eye path draws the viewer toward the right. | Use a smooth ease-in-out to transition from travel into coordinated magnetic choreography. |
| **D08 • 2.35s — Central anchor and orbit** | R3 reaches its final centre P and shared horizontal pose A. R2/R4 make a small, symmetric, controlled curved orbit around the anchor, then approach their respective upper/lower slots. R1/R5 are still at approx. 20–35° relative tilt and farther from centre, creating a sculptural suspended arrangement. | Maintain still copy. Optional subtle warm key-light travel begins across R3; no visible particle effect. | Align the secondary rings individually, with axes converging before the final axial docking begins. |
| **D09 • 2.65s — Perfect-axis anticipation** | All five become coaxial, with their true circular holes visibly aligned. R2/R4 stop at safe upper/lower staging slots; R1/R5 remain further out with 6–12° tilt, then straighten. Ring gaps create an elegant exploded product view. Keep a short, approximately 80–120 ms anticipatory deceleration before the contact cascade. | Text remains static. No glow, shockwave or flashing. | Accelerate toward target axial offsets over the final fraction of travel, then ease out just before contact. |
| **D10 • 2.95s — Inner magnetic docking** | R2 and R4 seat against R3 at their valid measured offsets, with slight 70–100 ms timing difference. R1 and R5 are independently approaching, still visibly separated. R3 remains anchored and may respond with a very small common-group settling tilt rather than moving out of place. | CTA stays usable and visually quiet. | The already docked inner rings remain attached to their correct offsets; outer pair closes in next. |
| **D11 • 3.25s — Outer lock and hero flourish** | R1 seats above R2 and R5 below R4. As final contacts occur, the entire stack performs a restrained unified counter-tilt (peak ~3–5°) and a small upward release (~0.03–0.06 D), followed by damped return. A warm specular reflection travels across the real lacquer and gold pattern. The flourish is created by rotation, actual lighting and movement, not a cartoon impact or glow. | Headline's dimensional edge relaxes to its final premium serif treatment; no content displacement. | Critically damped settle, exact target offsets and camera restored. |
| **D12 • 3.60s — Hero lock** | Complete five-layer stack accurately matches the current original hero pose on the right. Hollow centre visible, correct clearance, no camera movement, correct lighting and fully resolved geometry. Start idle from precisely this current pose and angular phase. | All UI fully readable, aligned and interactive. The intro never restarts because a component rerenders. | Crossfade the movement velocity into the gentle idle cycle, not the displayed geometry. |

### Suggested path control knots

These are normalized **screen targets for the leading ring** and depth design examples; adjust to actual hero dimensions, heading bounds, camera projection and ring radii. The other rings trail the same curved direction with phase offsets, local offsets and orientation variations, then join independent assembly paths. Y (world up) is inverse of V (screen down).

| Knot | Time | U | V | Z relative to headline depth | Orientation / intent |
|---|---:|---:|---:|---|---|
| K0 | 0.00 | -0.16 | 0.12 | -0.65D | Outside frame, far |
| K1 | 0.25 | 0.08 | 0.18 | -0.55D | Inclined, begin spiral |
| K2 | 0.65 | 0.26 | 0.35 | -0.40D | Behind text |
| K3 | 0.95 | 0.45 | 0.43 | -0.08D | Begin depth crossover |
| K4 | 1.30 | 0.53 | 0.45 | +0.35–0.55D | Short foreground pass |
| K5 | 1.65 | 0.70 | 0.46 | +0.10D | Spin away |
| K6 | 2.00 | P.u | P.v | Product-stage neutral Z | Decelerate, enter fan |
| K7 | 2.35–3.60 | P.u | P.v | Actual neutral product depth | Individual arc and docking offsets |

Adjust K2–K5 dynamically to keep the visual sweep near the right edge of text rather than crossing full lines. Z is measured relative to the heading depth plane, not necessarily the same origin as the final product position. The target product depth must be determined by the existing scene. Avoid treating these screen-space hints as fixed world coordinates.

### Travel and spin details

- Recommended path is a continuous cubic Bézier or Catmull–Rom-style 3D spline with C1 or better tangent continuity at path transitions; evaluate by path distance where needed for speed control.
- Ease the travel in during 0.00–0.35 s, maintain momentum through the main orbit, and ease out during 1.65–2.00 s.
- R1–R5 phase stagger: start with ~90 ms; adjust within 70–110 ms to distinguish separate rings. Use trailing offsets determined from actual bounds rather than only temporal delay.
- Each ring travels forward together but spins independently. Suggested total intentional travel-spin targets: R1 ~320°, R2 ~240°, R3 ~170–220°, R4 ~250°, R5 ~300° over its entrance and alignment. Vary direction slightly where visually suitable, without making the procession chaotic.
- Do not interpolate the spin angle through an unintended reverse direction at the final orientation. Compose an intentional continuous local-axis spin with tilt alignment; damp the spin speed as assembly approaches.
- Tilt ring plane relative to final pose by ~35–75° in the fast stage, ~20–35° at the sculptural fan, ~6–12° during alignment, and exactly 0° relative at the lock.
- Ring diameter must remain physically constant. If changing whole-group presentation scale is unavoidable for responsive fitting, establish it once, not as a substitute for perspective.
- Use screen-space projected bounds to revise path positions; never push objects into navigation, CTAs or outside the hero's safe clip area except deliberate entry/exit at the hero edge.

---

## 5. Dimensional headline choreography

### Visual goal

Give the existing luxury serif headline a short-lived, dimensional editorial treatment that feels like it is emerging into the same 3D space as the rings. Do not replace it with heavy metallic block letters, neon, oversized extrusions or a new font.

The headline must finish with the same elegant form, alignment, line length, colour and size that the existing Lacora page uses.

### Layer design

- The real semantic H1 remains actual selectable HTML text and preserves the existing accessible reading order.
- Use shallow line masks, perspective transforms, a subtle shadow/tinted edge or a visually aligned decorative depth layer to convey dimension.
- Front face: the existing warm ivory. Side/depth accent: dark burgundy tinted by the current background, not solid black.
- During reveal, a shallow 1–3 px apparent dimensional edge (at typical desktop size) and soft warm rim reflection can be used. Subdue or remove it once stable.
- Add a small perspective tilt about a line's baseline, not random letter rotations; front faces resolve to 0°.
- Blend the reveal with the rings' motion: the rings initially emerge from behind the text, then briefly pass in front near its edge.
- Keep decorative copies hidden from assistive technology, non-interactive, and synchronized with the real H1. Do not duplicate the heading in the accessibility tree.
- Respect the actual line wrapping per breakpoint. Build wrappers by intended responsive lines or a layout-aware method; don't hard-code desktop line breaks on mobile if they overflow.

### Desktop typography timeline

| Phase | Time | Effect |
|---|---|---|
| Eyebrow | 0.00–0.32 s | Short horizontal dash and label reveal from left; opacity rises; no large travel. |
| Line 1 — “Colour with” | 0.12–0.60 s | Masked upward reveal from approximately 0.35 line height below; rotateX from 12–16° toward 0° and small depth translation toward face; opacity 0 → 1. |
| Line 2 — “a story of” | 0.25–0.73 s | Same dimensional lift, delayed; slight opposite depth/rim phase if appropriate; coherent with first line. |
| Line 3 — “its own.” | 0.38–0.90 s | Final stagger; near ring passes at edge as this line settles. |
| Headline consolidation | 0.90–1.10 s | Resolve all lines to stable neutral perspective; no drift/reflow. |
| Description | 0.78–1.20 s | Fade and low 6–10 px upward travel; no letter-by-letter splitting. |
| Primary and secondary CTAs | 0.95–1.40 s | Subtle opacity/translate reveal, stagger 70–100 ms; layout and hit targets already valid. |
| Final lock | 3.25–3.60 s | If using a dimensional decorative edge, slightly soften it at the same time as product settling. Keep front faces unchanged. |

Use a smooth ease-out on text movement (for example cubic-bezier(0.22, 1, 0.36, 1)); avoid elastic text. Apply 3D transforms only to the reveal wrappers, not to the whole content container or final layout.

### Real foreground/background occlusion

A flat Canvas permanently above the DOM will put every ring in front of the text; a Canvas permanently behind it will make every ring remain behind. Neither is correct for the requested fly-by.

Preferred implementation, where the existing renderer supports it:

1. Keep the real heading in DOM. Match its projected glyph positions and dimensions to a depth-only heading occluder in the 3D scene.
2. A transparent hero-scoped 3D render layer sits above the heading and renders the ring scene. The heading glyph occluder writes depth but not colour, so rings behind the glyphs are hidden and the actual DOM glyphs show through.
3. Rings in front of the text plane cover the glyphs naturally via depth testing. Rings behind the spaces between letters remain visible.
4. Match occluder geometry, font, baseline, line wrapping and reveal transforms exactly; recalculate on resize/font readiness. Incorrect matching causes halos and ghost edges.
5. Keep navigation, descriptions where necessary and CTA interaction layers above the ring render layer. Use pointer-events: none on non-interactive animation surfaces.

Alternative if accurate glyph depth occlusion is impractical: coordinate a rear visual pass behind DOM text and a front pass above it, switching each ring only while its bounds are clear of the text or using a depth-aware clipping strategy; do not allow ring duplication, rectangular text masking or a one-frame layer pop at crossover. For lower-end devices or uncertain typography matching, reduce the overlap and prioritize clean reading.

**Guardrails:** Keep foreground overlap to the rightmost edge of a headline line, no more than a small fraction of the heading at once, and roughly 200–300 ms. Never obscure CTA labels or controls. The scene is decorative and must not intercept clicks/taps.

---

## 6. Signature final assembly — “Magnetic Bloom and Lock”

The final assembly is the emotional payoff and should be more distinctive than merely translating five rings downward.

### Step A — Sculptural fan (D07, 2.00 s)

The rings expand diagonally around the centre of the right product stage. Use separate, slightly curved trajectories and radial offsets. The central patterned ring arrives first and establishes the visually stable centre; the remaining rings rotate their axes toward it, as if attracted to it, without using literal magnet physics.

### Step B — Orbital bloom (D08, 2.35 s)

R3 achieves its final anchor pose. R2 and R4 make complementary short arcs above and below it; R1 and R5 flare outward with opposite tilts. The arrangement should feel like the jewellery is opening into a sculpture, not five disconnected objects drifting randomly.

Suggested staging relative to saved axial targets:

- Outer pair: temporary extra axial separation ~0.20–0.35D and a controlled radial offset ~0.08–0.15D.
- Inner pair: temporary extra axial separation ~0.10–0.18D and a controlled radial offset ~0.03–0.08D.
- These are starting ranges only. Reduce them whenever actual mesh bounds or the screen-space stage require it.
- Make radial offsets and tilt converge before axial gaps become small. Validate swept mesh volume before final approach.

### Step C — Coaxial anticipation (D09, 2.65 s)

All apertures align along a shared axis. Hold the visual exploded arrangement just long enough for the viewer to appreciate the craftsmanship (a brief ~80–120 ms near-hold, not a full animation pause). Use the slowdown to prepare the docking cadence.

### Step D — Inner-pair docking (D10, ~2.78–2.95 s)

- R2 docks first, then R4 roughly 70–100 ms later, or vice versa if that matches the scene’s motion direction better.
- R3 stays in its target slot. Approach along the shared axis from positive/negative side without crossing R3's volume.
- Use acceleration over the first half of travel and a short ease-out before contact. No penetration or harsh bouncing.
- Keep independent meshes and material response; they should look as if they have aligned together naturally.

### Step E — Outer-pair locking (D11, ~3.02–3.25 s)

- R1 docks into the remaining upper slot and R5 docks into the lower slot with slight stagger (~70–90 ms).
- Terminate each local tilt before it reaches contact. Preserve real ring thickness.
- Apply a small, unified settling gesture to the assembled group: lift ~0.03–0.06D, counter-tilt 3–5°, then return.
- A natural warm reflection sweeps from top burgundy ring across ivory and patterned centre toward the lower rings. Create this using a controlled light/environment-reflection movement compatible with the existing materials; do not animate colour channels or add false glow.
- No forced sound, vibration, aggressive flash, shockwave, sparks or explosion. The visual sequence alone should communicate the “lock”.

### Step F — Stable hero pose (D12, 3.60 s)

The group resolves into A exactly. The transition to idle should preserve its current angle and angular velocity; no teleport or snap between timelines. A small damped movement is acceptable during the flourish, but **the actual individual rings never overshoot past their valid contact offsets**.

---

## 7. Responsive mobile choreography — detailed 8-keyframe timeline

**Nominal duration: 2.70 seconds.** This is a distinct animation designed for portrait screens. Do not use the desktop X trajectory with a lower final Y value. Instead, use a controlled arc down the right margin of the content toward the dedicated lower product stage.

### Mobile visual layout

- Stage 1: compact navigation, eyebrow, headline, description and CTAs in the existing responsive content layout.
- Stage 2: centered 3D product stage with sufficient top/bottom breathing space for the five-ring exploded pose.
- Use actual DOM measurements. On portrait phones, target product-stage center U≈0.50, V≈stage's local center, not 0.50 of the full viewport.
- Use the original mobile product scale, capped by projected ring width. Budget roughly 75–90% of product-stage width for the assembled set; max during the mobile fly-by remains bounded by the content and product safe zones.
- For very narrow screens or when heading wraps further into the right margin, remove foreground text overlap and let the rings travel only within the lower product-stage region.
- If the lower stage is not fully visible when the page loads, use the short peripheral introduction only when it can be seen and settle the main product into its real lower stage. Do not auto-scroll the user, artificially fix content to the viewport, or extend the hero to show a scripted animation.

| Mobile frame | Time | Ring choreography | Text/interaction |
|---|---:|---|---|
| **M01 — Establish** | 0.00s | Background and dedicated lower product stage present; rings are outside the visible right edge or at rear depth in the upper-right peripheral area. | Header and reserved hero content ready; near-instant eyebrow and first line reveal. |
| **M02 — Peripheral entry** | 0.35s | Five rings enter individually from upper right in a small descending arc. Smaller apparent size and angles ~40–65°; trailing rings follow with ~45–75 ms delay. Stay behind or beside the text. | 3D masked headline reveals line-by-line, smaller tilt than desktop. |
| **M03 — Mobile depth crossover** | 0.75s | One lead ring may briefly advance toward camera beside the right-most headline edge. Keep all foreground bounds narrow; never cover a full word, description or CTA. Other rings curve down behind/peripheral to content. | Entire headline readable. Description/CTA already visible. If insufficient width, skip the text crossover and use product stage only. |
| **M04 — Downward sweep** | 1.10s | Rings enter the lower product stage in a downward diagonal curved path. Gradually increase apparent size as they approach product depth. Reduce speed; leave CTA and its entire tap target clear. | Text now static. The user may scroll or click normally. |
| **M05 — Centered fan** | 1.50s | Five rings form a diagonal floating fan centred in the lower stage. R3 moves to the mid-stage anchor first. Ring projected bounds remain inside stage; keep visible hollow centres. | Content remains unaffected, no layout shift. |
| **M06 — Controlled orbital bloom** | 1.90s | Central patterned ring anchors horizontally. Ivory pair makes a compact upper/lower arc; outer burgundy rings incline ~15–25°. Limit radial/axial travel compared with desktop. | Visual attention transitions to product. |
| **M07 — Compact magnetic docking** | 2.30s | Ivory rings are seating against R3; outer burgundy rings straighten and close in next. Use a quicker ~50–70 ms cadence. Small settling movement; no clipping into the CTA above or other section below. | CTA remains touchable. |
| **M08 — Mobile hero lock** | 2.70s | All five rings assemble in exact order and original pose, centred below content. Subtle highlight passes across the surface. Entire model quiet and ready for reduced-amplitude idle cycle. | Fully stable responsive content and product layout. |

### Mobile path suggestion

Use the **measured content rectangle**, **CTA exclusion rectangle**, and **product stage rectangle**. The following normalized directions are guidance, not fixed page coordinates:

1. Start near the upper-right hero edge (U≈1.12, rear depth).
2. Curve along the right boundary of the heading area (U≈0.85–1.00, far-to-neutral Z).
3. If safe, make one brief closer pass at U≈0.90; otherwise remain on a rear or stage-only path.
4. Bypass the CTA bounds completely: route around their right edge or stay behind content with no visible overlap, then descend into the product stage.
5. Traverse from the upper-right corner of that stage toward its horizontal centre.
6. Align around P, using compact axial/radial staging offsets and final contact positions.

If there is no real safe corridor around the CTA on a phone, **do not fly through it**. Start the visible rings at the product-stage's upper-right edge and perform the corkscrew entirely there. Beautiful motion is less important than readable commerce controls.

### Mobile typography and flourish

- Reveal eyebrow and line 1 immediately, then subsequent lines with ~75–100 ms stagger. Finish headline by ~0.70–0.85 s.
- Use shallow perspective tilt (~8–10°), smaller lift and subtle edge depth (~1–2 px). Do not allow the heading to overflow the screen or change line wrapping mid-animation.
- Finish description and CTA visual reveal by ~1.0 s; never postpone interaction.
- Reduce apparent foreground scaling and axial flare; reduce mobile final lift to ~0.02–0.04D and counter-tilt to ~2–3°.
- No costly full-screen post-processing blur on mobile; prefer model motion and clean lighting.

---

## 8. Tablet, landscape and breakpoint behavior

- Select choreography based on the actual layout mode and available clearance, not user agent or a hard-coded device list.
- Use desktop choreography where the hero has stable left text/right product columns and a viable 3D travel corridor.
- Use mobile choreography where the hero stacks vertically and locates the product beneath text.
- For intermediate two-column tablets, retain desktop logic but reduce horizontal orbit amplitude, projected foreground diameter, and overlap duration. If stage dimensions cannot safely contain the fan, use a shorter product-only entrance/compact assembly.
- A resize, orientation change or breakpoint transition during intro must not replay the cinematic opening. Recalculate final target from current layout, stop the old unsafe trajectory and transition to the new appropriate stable pose or resume only if safe.
- When a breakpoint changes during idle, smoothly fit the group to the new stage; preserve ring orientations/phase unless an immediate accessibility-safe settle is required.
- Use actual responsive stage geometry, safe-area margins and current font metrics. Test representative 320, 375, 390, 430, 768, 1024, 1280 and 1440 px widths plus short landscape viewports. These are QA widths, not mandatory app breakpoints.

---

## 9. Seamless continuous rotate → eject → rejoin loop

**Recommended loop duration: 8.0 seconds.** Starts immediately after D12/M08 from the final pose and existing angular phase. Keep the original product rotation/eject/rejoin feature; refine it to follow these motion principles or preserve equivalent existing behavior.

| Loop time | State | Motion |
|---|---|---|
| I01: 0.00–1.60 s | Product appreciation | Complete stack turns gently about its shared normal, with very small optional group tilt/parallax. |
| I02: 1.60–2.20 s | Anticipation | Ease angular speed slightly and optionally introduce subtle outward tension; centre anchor remains stable. |
| I03: 2.20–3.45 s | Eject / bloom | Outer R1/R5 move outward first with slight stagger; inner R2/R4 follow. Create controlled axial gaps, not random outward explosions. R3 stays centred. |
| I04: 3.45–4.70 s | Floating orbit | Five rings occupy a clean separated pose. Each rotates slightly independently around its own normal; display all lacquer surfaces and clear hollow centres. |
| I05: 4.70–5.95 s | Re-align | Radial offsets and small tilts reduce before axial closure. Inner pair approaches their measured target slots. |
| I06: 5.95–6.65 s | Rejoin | R2/R4 settle, then outer R1/R5. Use a softer docking cadence than the cinematic entrance. |
| I07: 6.65–8.00 s | Hero rotation | Stack becomes quiet and rotates as a whole; transition into the next cycle without a velocity or position snap. |

### Loop constraints

- Main movement is along the shared stacking axis; keep lateral drift restrained (~0.02–0.07D), and do not leave the product stage.
- Suggested maximum additional axial gap between adjacent rings: desktop ~0.08–0.15D, mobile ~0.04–0.09D, always subject to actual stage clearance and mesh collision.
- A reasonable starting shared idle rotation period is 12–20 s per full revolution; adjust for the existing appearance. Eject timing is a separate 8 s cycle. Use continuous rotational phase rather than resetting the full angular state to zero at the cycle boundary.
- If different ring axial spins are used, keep texture phase continuous across join/eject transitions; avoid visible jumps in pattern orientation.
- End each gap cycle at the same saved assembled offsets with zero or matched axial speed and consistent tilt.
- Desktop pointer parallax, if the current hero supports it: maximum ~2–4° rotation response and small translation; disable during intro and on touch devices unless an intentional restrained interaction already exists.
- No text animation repeat. No renewed full-page sweep while the visitor reads or shops.
- If the user prefers reduced motion, disable continuous automatic movement or use a static equivalent.

---

## 10. Animation lifecycle and initial-load behavior

Use an explicit state model rather than relying on mounting side effects or repeated timeouts.

| State | Meaning | Next behavior |
|---|---|---|
| STATIC_READY | Hero layout, text content, navigation and product space available; show static/fallback product if needed. | Check model readiness, animation history, visibility and reduced-motion preference. |
| PREPARE_INTRO | All five meshes/materials and required scene resources ready; responsive measurements valid. | Begin intro only if eligible and without excessive delay. |
| INTRO | Desktop or mobile timeline active. | On completion, transition once to final pose and idle; on scroll/interaction/resize, gracefully settle or skip. |
| SETTLE | Resolve transforms from current values to saved responsive targets. | Switch to idle when eligible, or static pose. |
| IDLE | Continuous product-stage loop, no intro replay. | Pause when not visible or when reduced motion is enabled. |
| PAUSED / STATIC | Offscreen, backgrounded, reduced motion, low capability or rendering failure. | Resume idle with current phase when safe, or retain static fallback. |

### First page load and navigation rules

- Play the full intro **once per browser tab/session** as a starting product decision. Do not replay on rerenders, normal internal route navigation back to Home, cart/account changes, hydration, or resize. An optional explicit replay control is outside the requested scope.
- Persist only the minimal session-level played state. If storage is blocked/unavailable, use in-memory state and remain functional.
- Never hide the page while waiting for models. Start with a stable hero layout and immediately render essential content.
- Target readiness within a brief window, e.g. ~500–900 ms after the visual hero appears when resources are cached/fast. If models/textures lag, use the existing static product fallback and skip the long intro rather than presenting a late surprise or blank stage. Exact readiness budget is a tuning decision; it must not block shopping.
- If a static product fallback is used, switch to the live model at a compatible pose; avoid a sudden double-product flash or large position mismatch.
- Run the animation only when the hero is sufficiently visible and the document is active. Pause or finish offscreen work; do not let the animation keep rendering invisibly.
- If the visitor starts scrolling away, navigates, activates a CTA, or reduces motion mid-intro, prioritize their actions. Stop/settle promptly and never capture page navigation.
- Respect normal browser back/forward restoration and PWA navigation. Do not require a network request merely to decide whether an already-played intro should repeat.

### Frame and resource lifecycle

- Use a single render/timeline clock; delta-time or absolute elapsed time, not per-frame increments that depend on display refresh rate.
- Handle frame drops without rushing to replay missed interaction states. Evaluate motion continuously or settle safely if a major interruption occurs.
- Stop obsolete tweens/animation handles on unmount, route change, breakpoint changes and context loss.
- Do not stack multiple render loops or duplicate mesh instances on repeated mounts.
- Keep product and text responsive measurement in a controlled layout-update phase; avoid per-frame layout read/write loops.
- Animate GPU-friendly transforms and opacity for HTML text; preserve document flow.
- Use existing renderer features and existing model assets. Do not add heavyweight motion or post-processing dependencies unnecessarily.

---

## 11. Lighting, shadows, blur and visual realism

- Preserve glossy lacquer, ivory finish, detailed woven red/burgundy/gold surface and current natural-looking environment.
- One subtle warm travelling highlight during fast depth pass or final docking can increase perceived dimensionality. Use actual scene lighting or environment reflection behavior rather than directly flashing object colours.
- Maintain believable shadows/ambient occlusion when rings are close. The background is an image/artwork, so avoid adding inconsistent hard shadows implying incorrect physical surfaces.
- Keep reflections stable relative to ring orientation and camera. Prevent flickering materials, aliasing, disappearing backfaces or reflections that overpower details.
- Motion blur is optional. Desktop only if lightweight and available; use short, realistic directional blur during D02–D06. Make the product sharp during D07–D12 and the idle loop. Do not blur heading, nav, description or CTAs.
- No artificial lens flare over the product, animated glitter, floating particles, strong bloom, violent shake or fake CGI energy. A warm specular sweep is sufficient.
- Keep the background's current visual hierarchy, readability, contrast and burgundy/white theme intact.

---

## 12. Performance and accessibility

### Performance targets and fallback

The following are design goals, not guarantees; profile on real devices and tune based on measured evidence.

- Smooth foreground motion at ~60 FPS where supported; gracefully reduce work for devices that cannot maintain stable animation. Aim for stable ~30 FPS as a practical reduced-quality target rather than stuttering.
- Cap renderer pixel ratio/resolution appropriately to device capability (e.g. start around 1–1.5 on lower-end mobile and profile; do not force maximum DPR universally).
- Keep exactly five existing ring meshes; reuse textures/materials and cached model data where valid. Avoid dynamic mesh reconstruction or new allocations each frame.
- Use minimal/disabled costly shadows, post-processing blur or other full-screen effects on mobile. Choose visual fidelity of the jewellery over decorative effects.
- Pause request/render loops when offscreen or hidden, and avoid unnecessary perpetual work for static states.
- WebGL/rendering unsupported, context lost, asset unavailable or engine failure: preserve a correctly sized static product representation and readable hero. No permanent spinner or transparent product stage.
- Avoid layout shift (reserve hero/product dimensions from initial render), network waterfall before content, and blocking main-thread operations during model setup.

### Accessibility and interaction

- Respect prefers-reduced-motion. Provide a stable product pose and immediate text; disable cinematic fly-through, automatic eject/rejoin and parallax when requested. React to preference changes.
- The H1 remains the real accessible H1. Decorative depth layers are ignored by assistive technologies.
- Preserve keyboard focus, tab order, touch targets, contrast and accessible CTA labels. Any visually hidden/revealing text must not cause a keyboard user to focus an invisible control; complete its reveal or settle immediately on focus.
- Non-interactive Canvas/render layers use pointer-events: none. Never intercept swipe/scroll, mouse wheel, selection or CTA clicks.
- The animated product is decorative; if meaningful product alt text exists in current UI, retain it in an accessible suitable element without duplicate announcements.
- No flashing, auto-playing sound, mobile vibration or forced scroll.

---

## 13. Implementation sequence for the development agent

1. Inspect the existing 3D model meshes, ring identities, materials, pivot origins and current neutral/idle transformations. Save the intended final offsets and verify the five open centres.
2. Inspect the existing desktop/mobile responsive hero structure and measure its heading bounds, CTA exclusion bounds and product-stage rectangle.
3. Implement the single timeline/state model, retaining current layout and static fallback. Define separate desktop and portrait timelines with a stable neutral pose.
4. Implement the curved ring paths with real camera depth, phase-staggered child transforms and robust clearance. Confirm D01–D07 and M01–M05 before proceeding.
5. Animate the existing HTML heading with shallow 3D-style dimensional line reveal; synchronize to timeline without modifying final typography or accessibility. Add a suitable real-depth occlusion approach; if exact glyph alignment is not possible, use safe non-overlapping or layer-based choreography.
6. Build the central anchor, expanded fan, staged alignment, staggered inner/outer docking and controlled group-level flourish. Validate true geometry at all stages, not just endpoint visuals.
7. Transition from entrance into existing/refined idle rotation and independent gap cycle with continuous phase and no snapping.
8. Add responsive remapping, mobile-safe exclusion, user reduced-motion handling, visibility pause, first-session replay rules, asset-readiness and rendering fallback.
9. Profile, test, and tune the path, timings, material reflections and exact safe bounds with the actual models. Use the storyboard as an art-direction guide only; validate production frames from the live scene.

### Implementation boundaries

- Do not redesign the homepage, navbar, collections, copy, products, theme, shopping flow or checkout.
- Do not change the final desktop composition or the final stacked mobile layout except for responsive spacing necessary to accommodate the existing product.
- Do not replace the actual 3D product with generated storyboard imagery or flattened ring images during normal 3D operation.
- Do not unconditionally introduce a new animation engine, new asset pipeline or new dependencies. Adapt to the app's existing stack.
- Do not make page interaction contingent on the animation completing.

---

## 14. QA and acceptance criteria

| ID | Scenario | Expected result |
|---|---|---|
| HERO-01 | First eligible desktop Home load | Full D01–D12 cinematic sequence, correct timing and 3.60 s nominal completion; essential UI available throughout. |
| HERO-02 | Desktop entry and fly-by | Rings enter independently, travel through real depth, show hollow centres, pass behind and briefly in front of the safe headline edge; no full heading/CTA obstruction. |
| HERO-03 | Five-ring order and identity | Original R1–R5 textures and thicknesses remain exact. No duplicate, missing, visibly intersecting or non-hollow ring. |
| HERO-04 | Desktop assembly | R3 anchors, R2/R4 seat first, R1/R5 seat second; smooth flourish then original final stack. No penetration, abrupt pop or incorrect order. |
| HERO-05 | Typography | Existing text receives synchronized dimensional stagger; final font, line breaks, colour and layout unchanged from intended responsive design. Text selectable/readable and accessible. |
| HERO-06 | Rendered depth | Behind-text rings are correctly occluded by glyphs or safe choreography; front pass is naturally layered; no rectangle masks, edge halos or visibility flicker. |
| HERO-07 | Portrait mobile Home load | Full M01–M08 sequence or small-screen safe alternative; rings descend into lower centred stage beneath text/CTA; nominal 2.70 s completion. |
| HERO-08 | 320px/short-height phone | No horizontal overflow, no navigation overlap, readable headline, tappable CTA, natural scroll; product safely within its layout stage even if below fold. |
| HERO-09 | Tablet/landscape/intermediate layouts | Sequence selected for actual composition; safe projected bounds; final product occupies its correct responsive stage. |
| HERO-10 | Resize or orientation change during intro | No replay, layout jump, stranded rings or overlap; settle into revised final pose safely. |
| HERO-11 | Idle rotation/eject/rejoin | Stack rotates, rings visibly separate, rotate individually and dock correctly; no drift, jump, title reanimation or positional reset between cycles. |
| HERO-12 | CTA during intro/idle | Collection and craftsmanship CTAs work immediately; navigation, cart, selection and scrolling are unaffected. |
| HERO-13 | Internal route navigation/back during session | Intro does not replay incorrectly; product returns to valid stable/idle state. |
| HERO-14 | Slow network/cold cache/failed model load | Hero readable immediately; static product fallback when appropriate; no loading gate or late dramatic replay. |
| HERO-15 | Reduced-motion option toggled | Immediate stable readable content, static product, no forced fly-through/eject/parallax. |
| HERO-16 | Offscreen/backgrounded hero | Only necessary work runs; on return no discontinuity, duplicated loops or unexpected intro replay. |
| HERO-17 | Low-powered device/high DPR | Graceful visual quality adjustment, no continuous excessive resource use, no frozen shopping UI. |
| HERO-18 | Keyboard, screen reader and touch | Logical semantics/focus order, no duplicate announcement, focus and tap actions remain available. |
| HERO-19 | Rendering error/context loss | Safe static product presentation, readable HTML content, no stuck hidden state. |
| HERO-20 | Visual regression | Final D12 desktop frame matches original current hero composition; final M08 is centred in dedicated lower stage. Brand and UI untouched outside designated motion. |

## 15. Final definition of done

The cinematic entrance is complete only when all five original rings perform convincing independent 3D travel, interact with the headline's visual depth without harming its readability, gather into a dramatic but controlled exploded formation, and dock in the correct order with a refined product-highlight flourish. Desktop and mobile must each use their appropriate responsive layout and trajectory. The existing slow rotate/eject/rejoin animation then continues inside the product area, shopping remains usable from first render, motion is accessible and resilient, and the final hero composition is unchanged apart from the requested animation.
