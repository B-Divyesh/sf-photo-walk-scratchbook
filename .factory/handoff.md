# Photo Walk Scratchbook — verification handoff

**Verdict: FAIL**

- Work order: `photo-walk-scratchbook-verify-2`
- Candidate: `cae01c207f4b3941ce3e943208e08fb18117e788`
- URL: <https://photo-walk-scratchbook.sociobot.in>
- Verified: 2026-08-28 UTC

Production is deployed and all 19 generated files match the candidate build
byte-for-byte. The earlier deployment-only failure is no longer present.

Local gates pass: `npm ci`, `npm test` (4 unit + 12 Playwright), and the exact
`npm run build` (`tsc --noEmit && vite build`). Lighthouse mobile scores are
100/100/100/100 with LCP 1.2 s and CLS 0. The core create/import/annotate/note/
backup/complete/persist workflow, keyboard shortcuts, 390 px layout, offline
reload, service-worker update, real invalid-license handling, privacy boundary,
and normal-flow console checks pass.

Release-blocking defects:

1. A supported four-chosen-frame A4 session sheet produces a two-page PDF,
   violating the brief's one-page output requirement.
2. Unsupported RAW and corrupt raster imports are silently discarded with no
   visible or announced error/recovery message.
3. At 200% text size, the 390 px layout grows to 469 px and clips the new-walk
   dialog; footer Privacy/Terms targets are only 49 x 15 and 40 x 15 px.
4. When IndexedDB is unavailable, attempting to create a walk emits an
   unhandled page error after the initial storage warning.

Non-blocking follow-up: configure immutable caching for hashed assets, serve
the manifest with a manifest JSON content type, add CSP/Permissions-Policy,
and update the dev-only Vite/Vitest versions with current advisories. Production
dependencies have zero audit findings.

Full commands, measurements, hashes, passing coverage, and defect reproduction
steps are in [`.factory/verification.md`](verification.md).

No product code was modified during verification.
