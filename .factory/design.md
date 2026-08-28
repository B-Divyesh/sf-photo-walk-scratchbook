# Photo Walk Scratchbook — visual thesis

## Direction: a working botanical field guide

This should feel like the notebook of a careful naturalist, not a gallery app: warm paper, dark field ink, specimen green, pencilled rules, stamped numbers, and small observations in the margins. The visual language supports the product's purpose—slowing down enough to decide what a photograph is about—without pretending the screen is literal paper. Controls remain precise and modern while sessions read as collected specimens.

The interface passes three tests: the active field action is visible immediately; decorative detail defers to photographs and notes; and depth comes from the physical stack of prompt slip, contact sheet, and annotation paper. On phones, the permanent sidebar collapses into a compact top rail and work areas stack. No workflow is removed.

## Palette

Light mode is the default field notebook:

| Token | Value | Role |
| --- | --- | --- |
| paper | `#F3EEDC` | page background |
| paper-deep | `#E6DDC2` | inset surfaces and rules |
| leaf | `#244C3A` | primary action, headings |
| leaf-dark | `#173529` | pressed/hover state |
| ink | `#202822` | body copy |
| graphite | `#5B6259` | secondary copy (7:1 on paper) |
| marigold | `#C97822` | selected specimen, focus accent |
| brick | `#9C3C32` | destructive/error state |
| success | `#39704C` | saved/online confirmation |

Dark treatment is “night blind”: `#141B17` ground, `#202A24` surface, `#ECE6D4` ink, `#B9C7B8` muted, `#90B39A` leaf, `#F1B061` marigold. It is manually selectable and also follows system preference before a choice is saved. Both treatments meet WCAG AA; color is always paired with a label, icon, or shape.

## Type and spacing

- Display and specimen labels: Georgia, Cambria, `Times New Roman`, serif. The familiar book face supplies field-guide authority without a network or font payload.
- Working notes and controls: Inter-like system stack (`ui-sans-serif`, system UI, Segoe UI, sans-serif). No third-party font or CDN request.
- Scale: 14 / 16 / 20 / 25 / 32 / clamp(40–64) px. Body never drops below 16 px; utility metadata is 14 px with strong contrast.
- Spacing uses a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64. Reading measure is capped at 68 characters. Interactive targets are at least 44 px with 8 px separation.

## Interaction grammar

- A walk advances like turning a specimen card: the next prompt slides in from the right, while back returns from the left.
- Photographs sit in a numbered contact sheet, not generic dashboard cards. Selection uses a marigold corner tab plus a check label.
- The annotation surface uses a restrained field palette. Pen, frame, arrow and text note tools are labelled; undo/redo and keyboard shortcuts are visible. Pointer input uses coalesced events when available for responsive stylus marks.
- Every mutation saves immediately to IndexedDB and confirms in a polite live region. Removing a photograph or session requires a named confirmation.
- Empty and offline states are written as useful field instructions, not dead ends.

## Motion policy

Only state continuity moves: prompt changes and drawers use 180–240 ms transforms/opacity; button press is 120 ms. Nothing loops. With `prefers-reduced-motion: reduce`, transitions and smooth scrolling become instant while borders, labels, and layer order retain all hierarchy.

## Original asset plan and provenance

Hero asset: a horizontal gouache-and-graphite still life of a small weathered film camera beside pressed fern fronds, contact prints and a pencil on cream field-notebook paper. It sets the product world and demonstrates no app capability. The UI also uses original hand-authored SVG leaf, camera, frame and arrow marks.

**Prompt sheet:** “Editorial botanical field-guide plate, overhead still life of a compact unbranded black 35mm camera, pressed fern and ginkgo specimens, two blank photographic contact prints, graphite pencil and crop marks on warm cream rag paper, restrained forest green, ochre, charcoal and faded brick palette, tactile gouache with fine graphite hatching, quiet overcast window light, generous negative space, horizontal composition, crisp paper texture, no people, no text, no watermark, no logo, no brand, no glossy 3D, no neon, no gradient.”

Generated on 2026-08-28 with the factory Azure OpenAI image deployment (`factory-image`). Original output and prompt sidecar live in `assets/src/`; optimized WebP is shipped from `public/assets/`. The generated scene is disclosed in the footer. All interface SVGs are authored for this product and MIT-licensed with the repository.

## Monetization boundary

The free field kit includes three prompt families, unlimited local sessions, photo import, pen/frame/arrow annotation, notes, JSON backup/restore, and accessible operation. A one-time “Full field kit” unlock adds the complete prompt deck, custom prompt cards, text labels on photographs, and the polished one-page PNG session sheet. Core data export and accessibility are never gated. Price is shown as **$12 one-time**; checkout and verification use the product slug through Sociobot, never a hard-coded provider product ID.
