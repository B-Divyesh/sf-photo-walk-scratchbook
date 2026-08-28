# Photo Walk Scratchbook — build handoff

Work order: `photo-walk-scratchbook-build-1`

Completed: 2026-08-28

Deployment class: static PWA (`dist/`)

## What shipped

- A complete, responsive photo-walk workflow: create or reopen walks, draw from a 6-card free prompt deck, record intent, import local JPEG/PNG/WebP previews, choose frames, add pen/frame/arrow marks, write framing and exposure notes, reflect, and complete the walk.
- A low-latency annotation canvas using normalized coordinates and coalesced pointer events. It supports stylus, mouse, touch, an accessible “Center frame” action, `R` keyboard framing, and `Ctrl/⌘ Z` undo.
- Local-first IndexedDB persistence for sessions, image blobs, notes, and marks. Complete JSON backup/restore is available to everyone; imported data replaces local data only after a named confirmation.
- A one-page printable/PDF session sheet for all users. Full-kit buyers can export a 1600×2260 annotated PNG containing the prompt, notes, and up to four chosen frames.
- One-time paid unlock at **$12** through the Sociobot product-slug API: hosted buy link, return-token capture and URL cleanup, local token storage, at-most-daily verification, optimistic cached unlock, invalid/revoked handling, and paste-to-restore. Accessibility, core annotations, printing, and JSON export are not gated.
- A versioned installable PWA: manifest, 192/512 maskable icons, standalone colors, navigation fallback, dynamically precached hashed shell assets, cache-first static assets, client claiming, and an in-app update toast.
- First-class empty, storage-error, invalid-format, offline, loading, and update states. Imported RAW files are honestly rejected with guidance to use camera previews.
- Light “field notebook” and dark “night blind” themes, visible focus treatment, reduced-motion fallback, ≥44 px targets, phone layout at 390 px, semantic landmarks, one `<h1>`, and legal pages at `/privacy/` and `/terms/`.
- Original botanical field-guide art generated for this product, manually reviewed, stored with prompt provenance, and optimized to responsive WebP. The design system and provenance are in `.factory/design.md`.
- README, MIT license, robots/sitemap, privacy/terms, and this handoff.

## Verification

Run from a clean clone:

```sh
npm ci
npm test
npm run build
```

Results on 2026-08-28:

- `npm test`: **passed** — 4 Vitest unit checks and 12 Playwright end-to-end checks (desktop Chromium + 390×844 touch Chromium).
- E2E coverage: persistence after confirmed save; raster import; choose/annotate/note/session-sheet path; light and dark axe scans; privacy and terms scans; license-return verification with a mocked Sociobot response; horizontal overflow; and `context.setOffline(true)` reload of the complete app shell.
- Axe: **0 serious or critical violations** on the home app in light/dark mode and on `/privacy/` and `/terms/`.
- `npm run build`: **passed**; `dist/index.html` is present. Initial application JS is 50.47 KB raw / 16.41 KB gzip; CSS is 26.74 KB raw / 6.58 KB gzip. Mobile hero is 34.12 KB; desktop hero is 105.75 KB. No font payload.
- Lighthouse 12.8.2 mobile against the production preview: **Performance 100, Accessibility 100, Best Practices 100, SEO 100**. FCP 1.1 s, LCP 1.2 s, Speed Index 1.1 s, CLS 0, Total Blocking Time 0 ms.
- Browser smoke check: correct title/lang/main/image alternatives, one `<h1>`, and no console errors on first load.
- `npm audit --omit=dev`: **0 production vulnerabilities**. Audit notices remaining in the install concern build/test-only transitive packages and are not shipped to browsers.

## Deployment notes

- Exact build command: `npm run build`.
- Publish directory: `dist` (static); `index.html` is at its root.
- Serve hashed `assets/` files as immutable. Keep `index.html`, `sw.js`, and `manifest.webmanifest` on short/no-cache headers so updates are found promptly.
- The factory must register `photo-walk-scratchbook` with the Sociobot billing API and set its return URL before live sales. There are no provider product IDs or secrets in this repository.
- No analytics, trackers, third-party fonts, scripts, or runtime CDNs are present.

## Known boundaries / next steps

- Browser storage can be evicted by the operating system; the product warns users to export JSON backups. Cloud backup is intentionally out of scope.
- The app accepts JPEG, PNG, and WebP previews only. It makes no RAW or calibrated-color claim and does not alter source photographs.
- Automated billing tests mock the documented verification response. The factory should perform one hosted staging checkout with the registered test product, then one production restore smoke test after registration.
- The annotated PNG uses the first four chosen frames to remain a legible single page; the full contact sheet and all originals remain in the local walk and JSON backup.
- Suggested pilot follow-up: measure the brief’s four-week outcome manually and privately—whether users complete three walks and record framing or exposure intent—without adding individual behavioral tracking.
