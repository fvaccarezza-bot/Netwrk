# Working rules for this project

Optimize for **speed and efficiency**. Do not repeatedly scan, audit, or re-read the entire project for small changes.

## 1. Work surgically

- Inspect only the files, selectors, functions and components relevant to the current task.
- Do not scan the entire repository unless the task genuinely requires it.
- Do not re-audit files that have already been analyzed unless something has materially changed.
- Reuse conclusions and context from previous work instead of rediscovering them.
- Prefer targeted searches (Grep) over reading entire large files.

## 2. Minimize context

- `styles.css` and `script.js` are large files. Never read them start-to-end unless absolutely necessary.
- Locate the relevant selector/rule/function first (Grep), then inspect only the surrounding context (Read with offset/limit).
- Do not inspect unrelated pages or assets.

## 3. Make minimal changes

- Modify only what is necessary for the requested task.
- Prefer editing existing rules instead of adding duplicate overrides.
- Do not refactor, reorganize, or rename unrelated code.
- Do not clean up unrelated code while working on another task.
- Do not modify JavaScript when a CSS solution is sufficient.
- Do not modify HTML structure unless necessary.

## 4. Preserve existing behavior

Before changing something, identify whether it affects:

- Desktop
- Retina band (see Architecture below)
- Ultra Wide (UW)
- Mobile
- the custom cursor
- Lenis smooth scrolling
- scroll-driven pin/parallax sections (about, stats, network, hero canvas)
- fixed/sticky elements
- responsive breakpoints

Protect existing working behavior unless the current task explicitly requires changing it.

## 5. Verify proportionally

- After a change, verify only the affected component/selector.
- Do not perform a full project audit after every small change.
- Do not repeatedly re-check unrelated breakpoints.
- If the change is isolated, verify it in the smallest relevant scope (one selector, one viewport width).

## 6. Avoid unnecessary breakpoints

Do not create breakpoint patches for individual screen widths unless there is a genuine design requirement.

Prefer, in this order of preference: `clamp()`, `min()`, `max()`, `vw`/`vh`, percentages, flex/grid, the existing breakpoint architecture.

Do NOT automatically convert every fixed pixel value into a fluid value — use the right unit for the actual design requirement. Small structural/decorative details (icons, hairline borders, hit-target padding) are often meant to stay fixed.

## 7. Separate structural work from visual tuning

Structural/responsive problems get solved first. After that, precise art-direction instructions ("make this text 72px", "move this 20px down", "make this logo 15% larger", "change this gap to 32px") get implemented directly — no need to reopen a broad architectural investigation unless there's a real conflict.

## 8. Communication

Keep responses concise. No long explanations of internal reasoning. For normal edits, report: what changed, which file(s), and any important side effect. Then stop.

## 9. Project principle

This is a highly custom visual website. Not every visual difference is a bug requiring a new abstraction. Preserve existing design intent. When something looks wrong, first determine whether it's (1) a structural responsive issue, (2) a specific visual adjustment, or (3) an actual bug — fix only the appropriate level.

## 10. Known architecture (don't rediscover this)

- Static site, no build step: `index.html`, `network-partners.html`, `terms.html` share `styles.css` and `script.js`.
- No GSAP/ScrollTrigger. Scroll-driven effects (about-pin, stats-pin, network-pin, hero canvas parallax) are hand-rolled vanilla JS in `script.js`, driven by `getBoundingClientRect()`/`scrollY` progress calculations inside `requestAnimationFrame` loops. Respect `reduceMotion` branches — most animated sections have a `prefers-reduced-motion` fallback that must stay in sync with the animated version.
- Lenis (`lenis@1`, CDN) provides smooth scroll; skipped when `reduceMotion` is true.
- Custom cursor (`.cursor-dot`/`.cursor-ring`) is appended directly to `<body>` and positioned via raw `clientX`/`clientY` — it must NEVER sit inside a zoomed, transformed, or scaled ancestor, or it desyncs from the real mouse position. **Never use `zoom` as a responsive-scaling shortcut** — it was tried and reverted because it broke this.
- **Retina band** = `(min-width:901px) and (max-width:1919.98px)`. This is the deliberate structural fix for "laptop-class retina screens render too big": most spacing/sizing uses `clamp(floor, calc, ceiling)` where the ceiling equals the pre-existing value at ≥1920px (UW, unchanged/protected) and the floor is the smaller value at 1280px. Reference points used throughout: `Wmin=1280px`, `Wmax=1920px`.
- UW (≥1920px, driven by `.wrap{max-width:1440px}`) is an already-tuned, protected baseline — don't change it unless explicitly asked.
- Mobile has its own breakpoints (`max-width:900px`, `max-width:600px`) — separate from the retina band, don't conflate them.
- `html`/`body` overflow: only `body{overflow-x:hidden}` is safe. Adding `overflow-x:hidden` to `<html>` breaks `position:sticky` for every pinned section on the page — confirmed regression, do not reintroduce it. If something visually overflows, contain it on the specific local ancestor (e.g. `.network-pin{overflow-x:hidden}`), not the document root.
- A recurring ~7–15px measurement discrepancy shows up in this environment between `window.innerWidth` and actual centered-content edges — it's a scrollbar-width artifact (classic reserved scrollbar vs. viewport), not a real bug, and is invisible on overlay-scrollbar systems (macOS trackpad). Don't chase it as if it were a real defect.
- Browser zoom (e.g. testing at 75%) used during visual reference/testing is a **visual target only** — never an implementation mechanism. Responsive behavior is implemented through real layout (clamp/flex/grid), not through scaling the rendered page.

## Most important rule

**Optimize for targeted work, not exhaustive analysis.** If a task can be solved by inspecting 20–50 lines around one selector, don't inspect the whole file. Only broaden the investigation when the targeted approach proves insufficient.
