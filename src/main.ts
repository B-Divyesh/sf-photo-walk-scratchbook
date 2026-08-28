import "./style.css";
import { ScratchbookApp } from "./app";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("App root not found");

const pathname = location.pathname.replace(/\/$/, "");

if (pathname === "/privacy" || pathname === "/terms") {
  const privacy = pathname === "/privacy";
  root.innerHTML = `
    <header class="legal-header"><a class="brand-link" href="/" aria-label="Photo Walk Scratchbook home"><span class="brand-mark" aria-hidden="true">⌁</span> Photo Walk Scratchbook</a><a class="button button-quiet" href="/">Return to field kit</a></header>
    <main id="main-content" class="legal-page">
      <p class="eyebrow">Field policy · 28 August 2026</p>
      <h1>${privacy ? "Privacy, kept close." : "Terms, in plain language."}</h1>
      ${privacy ? `
        <p class="lede">Your photographs, handwriting, and walk notes belong to you. The Scratchbook is designed so they do not need to leave your device.</p>
        <h2>What stays on your device</h2><p>Sessions, imported JPEG, PNG, and WebP files, annotations, notes, prompt choices, and backup data are stored in your browser’s IndexedDB. They are not uploaded to us. Removing site data in your browser removes that local copy, so use JSON backup regularly.</p>
        <h2>License checks</h2><p>If you buy the Full field kit, your license token is stored in localStorage. At most once a day, the app sends that token to the Sociobot billing API to confirm that it is active. The app receives a validity result and expiry information; it does not send your photographs or notes.</p>
        <h2>Payments and measurement</h2><p>Checkout is hosted by Sociobot, with Dodo as merchant of record. Their checkout privacy terms apply after you follow the buy link. This app includes no analytics, advertising, trackers, third-party fonts, or social pixels. We do not measure individual walks.</p>
        <h2>Your controls</h2><p>Use “Export JSON backup” to take a complete portable copy. You can remove individual walks in the app, or clear this site’s storage in your browser to erase everything. Questions can be sent to <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>
      ` : `
        <p class="lede">Use the Scratchbook for your own photographic practice. It is a field notebook—not a calibrated color tool, RAW developer, cloud archive, or promise that a photograph will be preserved.</p>
        <h2>Using the app</h2><p>You may use, install, and export from the app for lawful personal or commercial photography. You remain responsible for permission to photograph people, places, and copyrighted works, and for keeping backups of your local data.</p>
        <h2>Full field kit purchase</h2><p>The Full field kit costs $12 once and unlocks the complete prompt deck, custom prompts, text labels, and PNG session sheets. There is no subscription. Sociobot/Dodo is the merchant of record and handles checkout and refunds. A refund automatically revokes the corresponding license. You may restore a valid license on devices you control.</p>
        <h2>Availability</h2><p>The software is provided “as is” under the MIT license. Offline support depends on browser storage and service-worker support. We may improve or correct the app, but do not warrant uninterrupted availability or permanent storage.</p>
        <h2>Respectful use</h2><p>Do not abuse the license verification service or use the app to violate another person’s privacy or rights. These terms are governed by applicable law. Questions can be sent to <a href="mailto:support@sociobot.in">support@sociobot.in</a>.</p>
      `}
    </main>
    <footer class="site-footer"><span>Photo Walk Scratchbook</span><span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></span></footer>`;
} else {
  const app = new ScratchbookApp(root);
  void app.start();
}
