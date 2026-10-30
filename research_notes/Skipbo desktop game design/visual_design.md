# Visual Design for a Polished, Cartoony Digital Skip-Bo (code-generated art)

Research caveat: web search returned mostly low-quality or secondary sources. Items marked "Inference" are design recommendations (author judgment, not sourced). Concrete hex values, layouts and timings below are proposals for the implementer, not facts from sources.

## 1. How real Skip-Bo cards look, and an original-but-recognizable cartoony take

### Takeaway
The deck is 162 cards (12 each of 1-12 plus 18 wild), and the numbered cards come in color groups. Mattel's current edition adds symbols to cards for colorblind players. I could not find an authoritative description of exact artwork or band ranges, so use a generic "three color bands by number range + a distinct wild" scheme with original shapes.

### Cited Findings
- Deck is 162 cards: twelve each of 1 through 12 and eighteen "SKIP-BO" wild cards; wilds may stand for any number — [Wikipedia: Skip-Bo](https://en.wikipedia.org/wiki/Skip-Bo)
- Some secondary sites say the cards come in color groups (red, green, blue, plus "clear"/wild), but these are low-quality and conflict with each other (one also gives a wrong 120/42 split) — [Skip-Bo search results, e.g. desertcart listing](https://www.desertcart.com.cy/products/771767)
- Mattel's current version states that special graphic symbols were added to each card to identify its color, for any form of colorblindness — [Mattel/retailer listing](https://www.desertcart.com.cy/products/771767) (retailer copy quoting the product text; unverified against Mattel directly). Mattel shop page: [shop.mattel.com](https://shop.mattel.com/products/skip-bo-card-game-42050)
- A brand-guideline page mentions a box palette of red with gold lettering and blue cards — [madegooddesigns.com](https://madegooddesigns.com/skip-bo-brand-guidelines-2/) (third-party, not Mattel)

### Inferences
- My recollection (unsourced) is that physical cards use three color bands for 1-4, 5-8, 9-12, with a multicolored wild. Do not depend on this; make the band scheme your own so no copying issue arises.
- Original take: 3 bands, each with its own shape badge and its own mascot-free motif:
  - Low 1-4: teal/cyan `#2BA8D8`, circle badge, 1 pip-dot motif.
  - Mid 5-8: leaf green `#4CB944` (shift toward yellow-green `#7BC043`), diamond badge.
  - High 9-12: coral/orange-red `#F0603A`, star badge.
  - Wild: rainbow/conic gradient or deep purple `#7A4FD6` with a jester-star / "lightning" glyph and the word "SKIP" in a ribbon (do not reproduce the Skip-Bo logo or typography; use your own game name/ribbon).
- Card anatomy (SVG, 5:7 ratio, e.g. 100x140 viewBox): cream/white body, rx about 12, 3px dark navy outline `#1E2A44`, inner colored panel inset 6px, big number centered with thick outline (paint-order stroke), small number+shape badge in top-left and bottom-right (rotated 180), a subtle highlight arc (white at 25% opacity) across top-left for a glossy cartoon look, drop shadow offset (0,4) blur 0 at 25% black for a chunky look.
- Card back: navy to purple diagonal pattern with repeating rounded-star tile, centered emblem.
- Stock pile top card gets a gold border/ribbon plus count badge to distinguish it from other piles.

### Gaps
- No authoritative source for Mattel's true band ranges or artwork; not needed given the original-art constraint.

## 2. Cartoony card-game UI conventions: palettes, shapes, shadows, felt, typography

### Takeaway
Cartoony digital card games use thick dark outlines, saturated mid-tone fills, rounded corners, hard offset shadows, soft vignette backgrounds and chunky rounded display type. Fonts are the weak point: no system font is reliably rounded cross-platform, so bundle a free font (e.g. Nunito, Baloo, Fredoka) with a system-ui stack as a fallback.

### Cited Findings
- `system-ui` first in a font stack uses each OS's UI font (San Francisco on Mac, Segoe UI on Windows); Helvetica is Mac-only, so list Arial or sans-serif behind it — [fontsplugin.com web-safe fonts](https://fontsplugin.com/web-safe-system-fonts/), [SitePoint font stacks](https://www.sitepoint.com/eight-definitive-font-stacks-3/)
- Search found no authoritative source naming a truly rounded font present on both Mac and Windows; the claims found were SEO content. If a rounded look matters, use a web font such as Nunito with a system stack as fallback — [nunitofontmatch](https://nunitofontmatch-q7.pages.dev/nunito-web-safe-font-fallback-stack-options-for-cross-browser-compatibility-web-safe-rounded-fonts) (low quality)

### Inferences (design proposals)
- Palette tokens:
  - Table felt: radial gradient `#1F7A5A` center to `#0E3B3A` edge, plus faint repeating diamond/noise pattern at 6% opacity; wooden rim `#7A4B2A` with highlight `#A56A3C`. Alternative themes: blue felt `#2A5CAA`, purple `#4A2C7A`.
  - Ink/outline `#1E2A44`; card cream `#FFF8E7`; gold accent `#FFC93C`; UI panel `#2B3A67` at 85%; danger `#E5484D`; success `#3DD68C`.
- Shapes: radius 10-16px on cards, 999px pills for buttons/name tags; outline 3px (scale with card size); hard offset shadow (0, 0.04*cardH) plus soft ambient blur beneath; hover lift 8px with scale 1.06.
- Pile slots: dashed rounded outlines at 30% white with a small label icon; highlight valid drop targets with pulsing gold glow.
- Typography: display (numbers, titles) "Fredoka"/"Baloo 2"/"Lilita One" (all open-license Google Fonts; verify license when bundling); UI text "Nunito". Fallback stack: `"Nunito", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`. Numbers: bold, stroke via `paint-order: stroke fill` with 4px navy stroke; or draw numbers as SVG paths to guarantee identical rendering on all platforms.
- Everything from SVG/Canvas: build one `drawCard(ctx, value, size)` function, cache rendered cards to offscreen canvases per size (devicePixelRatio aware) for performance.

### Gaps
- Could not retrieve specific Dribbble/Behance or Hearthstone UI analyses via search; palette/outline conventions above are author judgment from general genre knowledge.

## 3. Layout for 2-6 players around a shared table

### Takeaway
Use a resolution-independent layout: design on a 1920x1080 virtual canvas (or a unit based on card height), scale uniformly to fit, and keep the human player's hand at the bottom with opponents arranged on an ellipse. Center holds the 4 building piles (and draw pile).

### Cited Findings
- No sources found for Skip-Bo-specific layouts. WCAG-related scalability points are in section 5.

### Inferences (design proposals)
- Skip-Bo zones per player: stock pile (top card visible, count badge), 4 discard piles (fanned vertically so the cards beneath are visible), hand of up to 5 cards. Shared center: 4 building piles (1-12) and draw pile; completed piles recycle.
- Unit system: u = viewport height / 100. Card height approx 14u for the local player, 8u for opponents (miniature, hands shown as card-back fan with count). At 1280x720: u=7.2px, card about 100px tall, which keeps the number legible (number glyph height at least 40% of card). At 4K: scale by devicePixelRatio, backing canvas = css size x dpr; cap dpr at 2-3 for performance.
- Positions (normalized to table ellipse):
  - 2 players: local bottom, opponent top.
  - 3: bottom, top-left, top-right.
  - 4: bottom, left, top, right.
  - 5: bottom, left, top-left, top-right, right.
  - 6: bottom, bottom-left, top-left, top-right, bottom-right plus top (or hex arrangement). For 5-6, opponent areas shrink to stock + discard + name tag; hands only as a card-count badge.
- Local player: stock bottom-left of center row, discards bottom-center row, hand centered below fanned with slight arc; on narrow aspect ratios (4:3) shrink fan overlap; on ultrawide, widen the table not the cards.
- Each seat has a name pill with avatar, stock-count badge and a turn ring. Active seat is enlarged slightly with a glowing rim.
- Keep a safe margin of 3% around the screen; HUD (menu, settings, log) in corners; do not overlap the hand.
- Provide a UI scale setting (80-150%) multiplying u.

### Gaps
- No survey of existing Skip-Bo apps' layouts done.

## 4. Animation and juice

### Takeaway
Use short eased tweens (ease-out for appearing, ease-in-out for moves), small squash/stretch, brief hit-stop and modest screen shake, and particles tied to game events. Restraint matters: juice should be seasoning.

### Cited Findings
- Core juice toolkit: screen shake, hit-stop, particles, tweening; apply in moderation, scale effect to importance of the action — [Game Developer: Squeezing more juice](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-), [Wayline Game Feel](https://www.wayline.io/learn/game-feel/1)
- Even 2 frames of hit-stop adds weight; a shake resolving in about 4 frames feels crisp; large shake can nauseate — [Slicker: Game feel in Pygame](https://slicker.me/python/game_feel_pygame.htm), [Wayline](https://www.wayline.io/learn/game-feel/1) (blog-grade sources, summarized by search tool)
- Easing (slow in/slow out) is a Disney principle and a cheap improvement; UI appearing animations should generally ease out — [Game Juice: Disney 12 principles in games](https://gamejuice.pages.dev/articles/disney-12-animation-principles-games)
- Particles should communicate state, not just look pretty — [Game Developer: 3 juice techniques from Slime Road](https://www.gamedeveloper.com/design/3-game-juice-techniques-from-slime-road)
- `prefers-reduced-motion` is a Baseline-widely-available media feature (since 2022-07) usable to cut non-essential animation — [MDN (mirror)](https://docs.w3cub.com/css/@media/prefers-reduced-motion)

### Inferences (proposed recipes; timings are starting values to tune)
- Deal: cards fly from draw pile to each seat, 80ms stagger, 350ms each, easeOutCubic with slight arc (quadratic bezier) and 5-10 degree rotation settling to 0; small bounce on landing (scale 1 to 1.08 to 1 over 120ms).
- Card play: lift on pick-up (scale 1.1, shadow grows), follow pointer with spring smoothing, snap to pile with easeOutBack 250ms; building pile shows a flash ring and the number pops (scale 1.3 to 1).
- Draw/refill hand: staggered flip (scaleX 1 to 0 to 1 swapping back/face) 200ms.
- Invalid move: horizontal shake 4 frames, red outline flash, return with easeOutBack.
- Pile clear (12 played): the 12 cards fan, sparkle burst (30-60 star/circle particles in band colors, gravity, fade 800ms), "+Clear!" text pop, pile sweeps to recycle with whoosh; small screen shake (2-3px, 150ms), 2-frame hit-stop.
- Stock pile emptied/win: confetti cannon from both bottom corners (200 particles, rotating rectangles/stars, palette tokens), winner's seat zooms to center, banner ribbon drops with bounce, rays rotating behind (conic gradient), final score/stat cards slide in with stagger; "Play again" button pulses.
- Turn indicator: glowing rotating ring around seat avatar, nameplate scale 1.1, subtle table-edge color tint toward player's color, plus a "Your turn" toast; never rely on color alone (add arrow/text).
- Idle polish: valid-move hints (optional) as gentle bobbing glow; wild card shimmer sweep every few seconds.
- Performance: pool particles, update with requestAnimationFrame using delta-time, cap particle counts, fixed 60fps target; skip shadows blur on low-end by pre-baking.
- Honor reduced motion: replace flights with 100ms fades, no shake, no confetti motion (static sparkle), and offer in-game toggles for shake/particles/speed.
- Sound is out of scope here.

### Gaps
- Sources are blog-grade; no primary data on ideal durations. Values must be playtested.

## 5. Accessibility

### Takeaway
Never encode card value band by color alone: pair each band with a shape badge and pattern, use the Okabe-Ito colorblind-safe palette as the base, meet WCAG contrast (4.5:1 text, 3:1 for graphical/UI elements), and support scaling and reduced motion. Mattel itself added symbols to cards for colorblind players.

### Cited Findings
- Okabe-Ito palette (8 colors): #E69F00, #56B4E9, #009E73, #F0E442, #0072B2, #D55E00, #CC79A7, #000000; widely used as colorblind-safe; for more categories combine with shape/pattern — [thematic okabe_ito docs](https://search.r-project.org/CRAN/refmans/thematic/html/okabe_ito.html), [Color Palettes guide](https://plotstyle.readthedocs.io/en/stable/guides/palettes.html) (secondary; the original 2008 Okabe-Ito publication was not retrieved)
- WCAG 2.2 SC 1.4.11 Non-text Contrast (AA): UI components and graphics needed to understand content need at least 3:1 against adjacent colors — [W3C Understanding 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast)
- Text: 4.5:1 for normal text, 3:1 for large text (SC 1.4.3) — [Stark: contrast minimum](https://www.getstark.co/wcag-explained/perceivable/distinguishable/contrast-minimum/)
- SC 1.4.1 Use of Color: color must not be the only visual means of conveying information — [UBS accessibility guideline summarizing 1.4.1](https://ubs.com/fx/en/web-publishing-guidelines/accessibility/checks-custom-made-html/using-color) (secondary)
- Mattel added graphic symbols to cards for colorblind identification — [retailer listing](https://www.desertcart.com.cy/products/771767)

### Inferences
- Map bands onto Okabe-Ito: low = sky blue `#56B4E9` (or `#0072B2`), mid = bluish green `#009E73`, high = vermillion/orange `#D55E00`; wild = purple/pink `#CC79A7` with gold. These three differ in luminance as well as hue, so they remain distinguishable in grayscale; verify with a CVD simulator (deuteranopia, protanopia, tritanopia) and a luminance check.
- Redundant cues: band shape badge (circle/diamond/star), pattern fill in the card margin (dots/stripes/checks at low contrast), and the number itself. Wild gets unique shape (lightning/jester star) plus the "SKIP" ribbon. Offer a "high-contrast / pattern cards" toggle and 4-color-deck option.
- Number text: dark navy on cream (contrast far above 4.5:1) with outline; if numbers are white on colored panels, check each against 4.5:1 and fall back to a dark outline.
- Keep outlines on cards and slot borders at 3:1 against the felt; avoid green-on-green.
- Scalability: layout in relative units, UI scale slider, minimum 16px-equivalent text, card number at least 40% of card height, support keyboard play (arrow keys / Enter) and visible focus ring with 3:1 contrast, and a text turn log for screen readers (ARIA live region if DOM-based UI).
- Motion: honor `prefers-reduced-motion`, avoid flashing more than 3 flashes/second for confetti/glow.

### Gaps
- Original Okabe-Ito paper and WCAG 2.2 primary pages (2.4.11 etc.) were not fetched directly; used secondary summaries. Real CVD simulation of the proposed palette was not performed.
