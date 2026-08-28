# Photo Walk Scratchbook

Photo Walk Scratchbook is an offline tablet and phone field notebook for photographers who want to make deliberate pictures with a real camera. Draw a constraint, take the walk, import local JPEG/PNG/WebP previews, mark framing and direction with a pen or stylus, and carry a one-page record into the edit.

It is deliberately not a camera, RAW developer, calibrated viewer, cloud photo archive, AI enhancer, or social feed. Photographs, annotations, and notes stay in browser IndexedDB unless the user explicitly exports them.

Live product: <https://photo-walk-scratchbook.sociobot.in>

## Field workflow

1. Start a walk and choose a prompt.
2. Record one shooting intention before leaving.
3. Import local camera previews into a contact sheet.
4. Choose frames and annotate them with pen, frame, or arrow marks. Keyboard users can add a centered frame with `R` and undo with `Ctrl/⌘ Z`.
5. Add framing, exposure, camera, place, weather, and reflection notes.
6. Print or save the one-page session sheet. Export a complete JSON archive at any time.

The free field kit includes six prompts, unlimited local walks, photo import, annotations, structured notes, printing/PDF, and complete JSON backup/restore. The **Full field kit is $12 once** and adds the 15-card deck, custom prompt cards, text marks, and annotated PNG session sheets. Checkout and license verification use the Sociobot billing API; no payment provider is embedded here.

## Develop

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Vite serves the app locally. No runtime API or environment variable is required for the free experience. Billing uses the production product-slug endpoints defined in `src/license.ts`; the factory registers the product separately.

## Test and build

```sh
npm test
npm run build
npm run preview
```

`npm test` runs Vitest unit coverage and Playwright 1.58.2 end-to-end checks in desktop and 390 px Chromium. It covers local persistence, import/choice/annotation/notes, light and dark accessibility scans, legal pages, purchase return verification, responsive overflow, and a service-worker offline reload.

`npm run build` is the exact production build command. It type-checks the source and writes the static deployment to `dist/`, with `dist/index.html` at its root and independent `/privacy/` and `/terms/` pages.

## Offline and data ownership

- IndexedDB stores walks and original imported preview blobs.
- A versioned service worker precaches the shell and caches built assets on first use.
- “Export JSON backup” includes the walk records, photographs, and normalized annotations; “Import backup” replaces the current local shelf after explicit confirmation.
- A valid Full field kit token and its daily verification verdict are the only data stored in localStorage.
- There are no analytics, third-party scripts, runtime CDNs, social pixels, or remote fonts.

Clearing this site’s browser data deletes the local archive, so users should export backups. See [the privacy page](https://photo-walk-scratchbook.sociobot.in/privacy/) and [terms](https://photo-walk-scratchbook.sociobot.in/terms/).

## Design and provenance

The product-specific botanical field-guide system and generated-art provenance are documented in [`.factory/design.md`](.factory/design.md). The original generated plate and prompt sidecars live in `assets/src/`; optimized WebP files ship from `public/assets/`. Interface marks and the PWA icon are original SVG/raster assets made for this project.

## Deployment

Deploy the contents of `dist/` as a static site. Configure long-lived immutable caching for hashed files under `dist/assets/`, and short/no-cache behavior for `index.html`, `sw.js`, and `manifest.webmanifest` so service-worker updates are discoverable. Infrastructure, DNS, billing registration, and product IDs are intentionally outside this repository.

## License

MIT — see [LICENSE](LICENSE).
