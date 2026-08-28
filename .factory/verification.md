# Independent product verification

**Verdict: FAIL**

- Work order: `photo-walk-scratchbook-verify-2`
- Candidate: `cae01c207f4b3941ce3e943208e08fb18117e788`
- Production URL: <https://photo-walk-scratchbook.sociobot.in>
- Verified: 2026-08-28 UTC
- Artifact: offline-first PWA

The live deployment exists and matches the candidate. The failure is therefore
not deployment-only: a core one-page export requirement and multiple required
error/accessibility states do not meet the acceptance contract.

## Release blockers

### V-01 — Major — four-frame session sheet prints as two pages

The brief's smallest useful product requires an exportable **one-page** session
sheet. Starting a normal walk, importing four valid PNGs, choosing all four,
adding reflection and exposure notes, opening **Session sheet**, and printing
to A4 with Chromium produced a 64,424-byte PDF whose PDF page tree reports
`/Count 2`. The UI and builder handoff explicitly support and describe up to
four chosen frames on one sheet.

Expected: the supported four-frame sheet fits one A4 page. Actual: two pages.

### V-02 — Major — rejected/corrupt photographs fail silently

Two independent invalid-input cases were exercised through the live file
input:

- `capture.NEF` with `image/x-nikon-nef`
- invalid bytes named `broken.png` with `image/png`

In both cases `#photo-error` remained hidden and empty, no frame was added, and
the user received no recovery guidance. This contradicts the promised
first-class invalid-format state. The implementation constructs an error, then
rerenders the contact sheet and removes it; decode failures are also appended
after the only error-rendering branch.

### V-03 — Major — required mobile accessibility boundaries fail

At the normal 390 x 844 viewport there is no horizontal overflow and axe finds
no serious/critical issue, but two required manual checks fail:

- With text resized to 200%, document width becomes 469 CSS px (body 468 px)
  in a 390 px viewport. The new-walk dialog extends to x=397.5 px, causing
  clipping/horizontal scrolling.
- Footer links are below the required 44 x 44 CSS px touch target: Privacy is
  49 x 15 px and Terms is 40 x 15 px.

### V-04 — Major — storage failure recovery emits an unhandled page error

With IndexedDB blocked before startup, the app correctly renders “Local shelf
unavailable.” Attempting to create a walk then shows the workspace and announces
the storage error, but also emits an uncaught page error:
`IndexedDB blocked for QA`. This fails the required error-recovery/no-page-error
behavior and risks users continuing under the impression that work is saved.

## Other defects

### V-05 — Minor — production caching and response policy are incomplete

- Hashed JS/CSS/images are served as `public, must-revalidate, max-age=30`, not
  long-lived immutable assets as required by the PWA performance contract and
  builder deployment notes.
- `manifest.webmanifest` is served as `application/octet-stream` rather than a
  manifest JSON type. Chromium still parsed it and reported zero installability
  errors.
- HSTS, `nosniff`, and `strict-origin-when-cross-origin` are present, but no
  Content-Security-Policy or Permissions-Policy header is present.

### V-06 — Minor — pinned development toolchain has known advisories

`npm audit` reports one high advisory on Vite 7.1.3 and one critical advisory on
Vitest 3.2.4. `npm audit --omit=dev` reports zero vulnerabilities, so these are
not shipped runtime dependencies, but the local build/test toolchain should be
updated.

## Clean-checkout gates

Tests were run from a detached, clean worktree at the exact candidate.

| Check | Result |
| --- | --- |
| `npm ci` | PASS; lockfile installed 61 packages |
| `npm test` | PASS; 4/4 Vitest and 12/12 Playwright tests |
| Type check | PASS through `tsc --noEmit` in the exact build |
| Lint | Not present in `package.json` |
| `npm run build` | PASS; Vite 7.1.3, 12 modules, `dist/` produced |
| `npm audit --omit=dev` | PASS; 0 production vulnerabilities |

Production bundle sizes:

- Initial JS: 50,473 bytes raw / 16.41 kB gzip (budget 200 kB)
- CSS: 26,739 bytes raw / 6.58 kB gzip (budget 50 kB)
- Mobile hero: 34,120 bytes (budget 300 kB)
- Desktop hero: 105,752 bytes
- Fonts: 0 bytes

## End-to-end evidence

The following passed locally and on the live URL unless noted:

- Empty required title is rejected by native validation and the dialog remains
  open. An 80-character title/place boundary renders escaped text safely.
- A walk can be created, intention recorded, valid PNG imported, chosen, marked
  with a centered frame, annotated with framing/exposure notes, completed,
  reloaded, and reopened with all data intact.
- Pen-like pointer input at 390 px creates a mark which survives closing and
  reopening the annotator. Keyboard `R` creates a centered frame and
  `Ctrl+Z` removes it.
- JSON backup downloads with version 1, complete session data, the imported
  image data URL, and an appropriate filename. Broken JSON and version 2 data
  produce useful live-region errors without replacing the existing walk.
- Cancelling a photograph deletion retains the photograph.
- License return tokens are stripped from the page URL and stored under
  `sb_license:photo-walk-scratchbook`. The real API returned
  `{valid:false, reason:"invalid"}` for a synthetic invalid token; the UI
  quietly relocked and showed “License no longer active (invalid).” The buy URL
  is the required Sociobot product-slug checkout URL.
- The free workflow makes no cross-origin request. Static review found no
  analytics, telemetry, social pixels, remote fonts, or upload code; the only
  runtime external request is an explicit license verification to the Sociobot
  API. Imported photos and session data were observed in IndexedDB/local
  object URLs and the exported backup.
- Offline reload succeeds with the app, saved walk, and imported image present;
  the offline status is visible. A controlled update fixture changed the SW
  cache from `scratchbook-v1.0.2` to `v1.0.3`: the update toast appeared,
  activating it caused one reload, old caches were removed, and saved data
  remained.
- Chromium reports zero manifest errors and zero installability errors.
- Desktop keyboard-only traversal reaches the skip link, start action, native
  dialog controls, session steps, and file input with a visible 3 px outline.
  The annotator receives focus, exposes its instructions, supports `R` and
  `Ctrl+Z`, and closes from the next keyboard-focused action.
- Normal 1440 px desktop and 390 px mobile layouts were visually reviewed.
  The product-specific field-guide hierarchy is coherent, and normal mobile
  layout has no horizontal overflow.
- Reduced-motion media emulation matches; decorative transforms are removed
  and transitions reduce to 0.01 ms.
- Axe reported zero serious/critical violations on the initial and populated
  app, dark mode, `/privacy/`, and `/terms/`. No console or page errors occurred
  in normal local/live flows.
- `/opt/fleet/lib/verify-url.sh` passed production: HTTP 200, title present,
  `lang=en`, one `h1`, a `main`, no missing image alt, no unlabeled button, and
  no console/page error; measured load was 686 ms.
- Lighthouse 12.8.2 mobile on production: Performance 100, Accessibility 100,
  Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.2 s, Speed Index 1.0 s,
  TBT 0 ms, CLS 0, TTI 1.2 s.

## Deployment identity and headers

All 19 files from a fresh candidate `dist/` were fetched from production and
compared byte-for-byte: **19/19 matched**, including HTML, legal pages, service
worker, manifest, icons, images, JS, CSS, and source maps. Key candidate/live
SHA-256 values:

- `index.html`: `b530b79c04122fe4ac3ede8bdc2ae1bcbfe23bbe52fa88391564c4c490f7a22d`
- `assets/main-Z2eyRSMa.js`: `75a58730dd24c212d78062305308d3d860dd8dfcbb4d31ca6d91f487d43b35d0`
- `assets/main-OMEjb9GS.css`: `90c6465e8b7ea6d4509a28c2728492765352659b014d55c8cb51c80ba80489ef`
- `sw.js`: `accef2c23bab1e1b956c6f9368bc02c7db0ead22fb500da4666516e9e278e5b6`

Production returns HTTPS 200 for `/`, `/privacy/`, and `/terms/`. The host uses
an application-shell fallback for unknown navigation routes. Root HTML and the
service worker use the intended short 30-second revalidation policy; the same
policy is incorrectly applied to hashed assets as described in V-05.

## Final assessment

**FAIL.** Deployment and the broad workflow are healthy, but V-01, V-02, V-03,
and V-04 violate explicit core-function, invalid-input, accessibility, and
error-recovery requirements. Fix them and rerun the same clean-checkout and live
matrix before release acceptance.
