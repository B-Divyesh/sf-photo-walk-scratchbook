import { containBox, drawMarks, normalizePoint } from "./annotation";
import { FREE_PROMPTS, FULL_PROMPTS, nextPrompt, promptById } from "./data";
import { captureReturnedLicense, CHECKOUT_URL, initialLicense, storeLicense, verifyLicense } from "./license";
import { createSessionSheet, downloadBlob, safeFilename } from "./sheet";
import { createBackup, loadState, readBackup, saveState } from "./storage";
import type { LicenseState, Mark, PhotoRecord, ScratchbookState, Tool, WalkSession } from "./types";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function announce(message: string): void {
  const live = document.querySelector<HTMLElement>("#live-region");
  if (live) live.textContent = message;
}

function downloadJson(value: unknown, filename: string): void {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }), filename);
}

export class ScratchbookApp {
  private state: ScratchbookState = { version: 1, sessions: [], activeView: "prompt" };
  private license: LicenseState = { token: null, valid: false, checking: false };
  private loadError = "";
  private saveTimer = 0;
  private objectUrls: string[] = [];

  constructor(private readonly root: HTMLElement) {}

  async start(): Promise<void> {
    captureReturnedLicense();
    this.license = initialLicense();
    this.renderLoading();
    try {
      this.state = await loadState();
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : "Local storage is unavailable.";
    }
    this.render();
    this.registerServiceWorker();
    this.attachNetworkState();
    if (this.license.token) {
      this.license = { ...this.license, checking: true };
      this.updateLicenseStatus();
      this.license = await verifyLicense(this.license);
      this.updateLicenseStatus();
    }
  }

  private renderLoading(): void {
    this.root.innerHTML = `<main id="main-content" class="loading-page"><p class="eyebrow">Opening the field kit</p><h1>Photo Walk Scratchbook</h1><div class="loading-line" role="status">Gathering your local walks…</div></main>`;
  }

  private get activeSession(): WalkSession | undefined {
    return this.state.sessions.find((session) => session.id === this.state.activeSessionId);
  }

  private releaseObjectUrls(): void {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls = [];
  }

  private photoUrl(photo: PhotoRecord): string {
    const url = URL.createObjectURL(photo.blob);
    this.objectUrls.push(url);
    return url;
  }

  private render(): void {
    this.releaseObjectUrls();
    const session = this.activeSession;
    this.root.innerHTML = `
      <header class="app-header">
        <button class="brand-button" data-action="home" aria-label="Photo Walk Scratchbook home">
          <span class="brand-mark" aria-hidden="true">⌁</span><h1>Photo Walk Scratchbook</h1>
        </button>
        <div class="header-actions">
          <span id="connection-state" class="connection-state ${navigator.onLine ? "" : "offline"}" aria-live="polite"><span aria-hidden="true">●</span> ${navigator.onLine ? "Ready offline" : "Offline · saved locally"}</span>
          <button class="icon-button" data-action="theme" aria-label="Change color theme" title="Change color theme">◐</button>
          <button class="button button-quiet" data-action="kit">Field kit</button>
        </div>
      </header>
      ${session ? this.renderSession(session) : this.renderHome()}
      ${this.renderDialogs()}
      <div id="live-region" class="sr-only" role="status" aria-live="polite"></div>
      <div id="update-toast" class="toast" hidden><span>A fresh field kit is ready.</span><button class="button button-small" data-action="update-app">Update</button></div>
      <footer class="site-footer"><span>Private by default · made for the walk, not the feed.</span><span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <span title="Original AI-assisted field-guide illustration">Generated art disclosed</span></span></footer>`;
    this.bindEvents();
    this.syncTheme();
  }

  private renderHome(): string {
    const sessions = [...this.state.sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const completed = sessions.filter((session) => session.completedAt).length;
    return `<main id="main-content">
      ${this.loadError ? `<div class="alert alert-error" role="alert"><strong>Local shelf unavailable.</strong> ${escapeHtml(this.loadError)} You can still look around, but this browser may not preserve new work.</div>` : ""}
      <section class="hero" aria-labelledby="hero-heading">
        <div class="hero-copy">
          <p class="eyebrow">An offline field notebook for deliberate pictures</p>
          <h2 id="hero-heading">Leave the phone camera alone. Bring your intention.</h2>
          <p class="hero-lede">Draw a prompt, walk with your real camera, then mark the frames worth carrying into the edit. No enhancement, cloud archive, or feed.</p>
          <div class="hero-actions"><button class="button button-primary" data-action="new-walk">Start a photo walk</button><button class="button button-secondary" data-action="browse-prompts">Browse prompt deck</button></div>
          <p class="trust-note"><span aria-hidden="true">✦</span> Photos and handwriting stay in this browser.</p>
        </div>
        <figure class="hero-plate"><picture><source media="(max-width: 700px)" srcset="/assets/field-kit-hero-720.webp"><img src="/assets/field-kit-hero.webp" width="1200" height="800" fetchpriority="high" decoding="async" alt="Illustrated field guide plate with an unbranded camera, pressed fern and ginkgo leaves, blank contact prints, and a pencil."></picture><figcaption>Plate 01 · tools for looking slowly</figcaption></figure>
      </section>
      <section class="shelf" aria-labelledby="walks-heading">
        <div class="section-heading"><div><p class="eyebrow">Your local shelf</p><h2 id="walks-heading">Walk records</h2></div><p class="shelf-count"><strong>${sessions.length}</strong> walks · <strong>${completed}</strong> complete</p></div>
        ${sessions.length ? `<ol class="session-list">${sessions.map((item, index) => this.renderSessionRow(item, index)).join("")}</ol>` : `<div class="empty-shelf"><span class="specimen-number" aria-hidden="true">01</span><div><h3>No walks pressed here yet</h3><p>Begin with one prompt. You can import camera JPEGs later—even after you return home.</p><button class="text-button" data-action="new-walk">Draw the first prompt <span aria-hidden="true">→</span></button></div></div>`}
      </section>
      <section class="method" aria-labelledby="method-heading"><p class="eyebrow">The field method</p><h2 id="method-heading">Prompt. Walk. Mark.</h2><ol><li><span>1</span><h3>Choose an attention</h3><p>Carry one constraint instead of a shot list.</p></li><li><span>2</span><h3>Import selects locally</h3><p>Build a small contact sheet from camera JPEGs, PNGs, or WebP files.</p></li><li><span>3</span><h3>Draw what you meant</h3><p>Mark framing, direction, exposure, and the picture you want to keep.</p></li></ol></section>
    </main>`;
  }

  private renderSessionRow(session: WalkSession, index: number): string {
    const chosen = session.photos.filter((photo) => photo.chosen).length;
    return `<li><button class="session-row" data-action="open-session" data-id="${session.id}"><span class="specimen-number">${String(index + 1).padStart(2, "0")}</span><span class="session-title"><strong>${escapeHtml(session.title)}</strong><small>${escapeHtml(session.prompt)}</small></span><span class="session-meta"><span>${formatDate(session.createdAt)}</span><span>${session.photos.length} frames · ${chosen} chosen</span></span><span class="row-arrow" aria-hidden="true">→</span></button></li>`;
  }

  private renderSession(session: WalkSession): string {
    const steps: Array<[typeof this.state.activeView, string, string]> = [["prompt", "01", "Prompt"], ["contact", "02", "Contact sheet"], ["notes", "03", "Field notes"], ["sheet", "04", "Session sheet"]];
    return `<main id="main-content" class="workspace">
      <aside class="walk-rail" aria-label="Walk steps"><button class="back-link" data-action="home"><span aria-hidden="true">←</span> All walks</button><div class="walk-identity"><p class="eyebrow">Current specimen</p><h2>${escapeHtml(session.title)}</h2><p>${formatDate(session.createdAt)}${session.location ? ` · ${escapeHtml(session.location)}` : ""}</p></div><nav aria-label="Session sections"><ol>${steps.map(([view, number, label]) => `<li><button class="rail-step ${this.state.activeView === view ? "active" : ""}" data-action="view" data-view="${view}" ${this.state.activeView === view ? 'aria-current="page"' : ""}><span>${number}</span>${label}</button></li>`).join("")}</ol></nav><button class="button button-quiet rail-delete" data-action="delete-session">Delete this walk</button></aside>
      <div class="work-area">
        <div class="mobile-steps" aria-label="Walk steps">${steps.map(([view, number, label]) => `<button data-action="view" data-view="${view}" class="${this.state.activeView === view ? "active" : ""}" aria-label="${number} ${label}" ${this.state.activeView === view ? 'aria-current="page"' : ""}>${number}<span>${label}</span></button>`).join("")}</div>
        ${this.state.activeView === "prompt" ? this.renderPrompt(session) : this.state.activeView === "contact" ? this.renderContact(session) : this.state.activeView === "notes" ? this.renderNotes(session) : this.renderSheet(session)}
      </div>
    </main>`;
  }

  private renderPrompt(session: WalkSession): string {
    const prompt = promptById(session.promptId);
    return `<section class="work-section prompt-work" aria-labelledby="prompt-heading"><div class="work-heading"><div><p class="eyebrow">Step 01 · set your attention</p><h2 id="prompt-heading">Carry one question outside.</h2></div><span class="save-state">Saved on this device</span></div>
      <article class="prompt-slip"><div class="prompt-index"><span>${prompt.family}</span><span>${String(FULL_PROMPTS.findIndex((item) => item.id === prompt.id) + 1).padStart(2, "0")} / ${this.license.valid ? FULL_PROMPTS.length : FREE_PROMPTS.length}</span></div><blockquote>${escapeHtml(session.prompt)}</blockquote><p>${escapeHtml(session.constraint)}</p><div class="prompt-actions"><button class="button button-secondary" data-action="next-prompt">Next prompt <span aria-hidden="true">→</span></button><button class="text-button" data-action="browse-prompts">View the deck</button></div></article>
      <div class="field-form"><label for="intention">What will you pay attention to?</label><p id="intention-help">Write one sentence before you walk. It can change later.</p><textarea id="intention" data-field="intention" data-session-field rows="3" aria-describedby="intention-help">${escapeHtml(session.intention)}</textarea></div>
      <div class="next-step"><div><strong>Ready to step outside?</strong><p>Your session saves automatically and works without a connection.</p></div><button class="button button-primary" data-action="view" data-view="contact">Open contact sheet <span aria-hidden="true">→</span></button></div>
    </section>`;
  }

  private renderContact(session: WalkSession): string {
    return `<section class="work-section" aria-labelledby="contact-heading"><div class="work-heading"><div><p class="eyebrow">Step 02 · local import</p><h2 id="contact-heading">Contact sheet</h2><p class="heading-note">JPEG, PNG, or WebP only. Original files are copied into this browser; nothing uploads.</p></div><label class="button button-primary file-button" for="photo-input">Import photographs<input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple></label></div>
      <div id="photo-error" class="alert alert-error" role="alert" hidden></div>
      ${session.photos.length ? `<div class="contact-summary"><span>${session.photos.length} frames</span><span>${session.photos.filter((photo) => photo.chosen).length} chosen</span><span>${session.photos.filter((photo) => photo.marks.length).length} marked</span></div><ol class="contact-grid">${session.photos.map((photo, index) => this.renderPhoto(photo, index)).join("")}</ol>` : `<div class="contact-empty"><div class="empty-contact-icon" aria-hidden="true"><span></span></div><h3>Your table is clear</h3><p>Import a small first edit from your camera card or local files. RAW development belongs in your editor; this notebook accepts finished previews.</p><label class="button button-primary file-button" for="photo-input-empty">Choose local photographs<input id="photo-input-empty" type="file" accept="image/jpeg,image/png,image/webp" multiple></label></div>`}
    </section>`;
  }

  private renderPhoto(photo: PhotoRecord, index: number): string {
    return `<li class="contact-photo ${photo.chosen ? "chosen" : ""}"><button class="photo-open" data-action="annotate" data-id="${photo.id}" aria-label="Open ${escapeHtml(photo.name)} for annotation"><img src="${this.photoUrl(photo)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async" alt="Imported photograph ${index + 1}: ${escapeHtml(photo.name)}"><span class="frame-number">${String(index + 1).padStart(2, "0")}</span>${photo.marks.length ? `<span class="mark-count">${photo.marks.length} mark${photo.marks.length === 1 ? "" : "s"}</span>` : ""}</button><div class="photo-controls"><label class="choice-control"><input type="checkbox" data-action="choose-photo" data-id="${photo.id}" ${photo.chosen ? "checked" : ""}><span>${photo.chosen ? "Chosen frame" : "Mark as chosen"}</span></label><button class="icon-button danger" data-action="delete-photo" data-id="${photo.id}" aria-label="Remove ${escapeHtml(photo.name)}">×</button></div></li>`;
  }

  private renderNotes(session: WalkSession): string {
    const chosen = session.photos.filter((photo) => photo.chosen);
    return `<section class="work-section" aria-labelledby="notes-heading"><div class="work-heading"><div><p class="eyebrow">Step 03 · write beside the frame</p><h2 id="notes-heading">Field notes</h2><p class="heading-note">Name the decision before a full editor makes it easy to forget.</p></div><span class="save-state">Saved on this device</span></div>
      <div class="session-details"><label>Place<input data-session-field data-field="location" value="${escapeHtml(session.location)}" autocomplete="off"></label><label>Light / weather<input data-session-field data-field="conditions" value="${escapeHtml(session.conditions)}" autocomplete="off"></label></div>
      <div class="notes-grid"><div class="field-form"><label for="camera-notes">Camera and exposure notes</label><p id="camera-help">Lens, focal length, shutter, aperture, ISO—or simply what should stay sharp.</p><textarea id="camera-notes" data-session-field data-field="cameraNotes" rows="5" aria-describedby="camera-help">${escapeHtml(session.cameraNotes)}</textarea></div><div class="field-form"><label for="reflection">What changed while looking?</label><p id="reflection-help">Reflect on the walk, not the quality of the file.</p><textarea id="reflection" data-session-field data-field="reflection" rows="5" aria-describedby="reflection-help">${escapeHtml(session.reflection)}</textarea></div></div>
      <section class="chosen-notes" aria-labelledby="chosen-heading"><div class="section-heading"><div><p class="eyebrow">Frame records</p><h3 id="chosen-heading">Chosen photographs</h3></div><button class="text-button" data-action="view" data-view="contact">Change selection</button></div>${chosen.length ? `<ol>${chosen.map((photo) => `<li><img src="${this.photoUrl(photo)}" alt="Chosen photograph ${escapeHtml(photo.name)}" width="${photo.width}" height="${photo.height}" loading="lazy"><div><strong>${escapeHtml(photo.name)}</strong><label>Framing intention<textarea rows="2" data-photo-field="framingNote" data-id="${photo.id}">${escapeHtml(photo.framingNote)}</textarea></label><label>Exposure intention<textarea rows="2" data-photo-field="exposureNote" data-id="${photo.id}">${escapeHtml(photo.exposureNote)}</textarea></label></div><button class="button button-quiet" data-action="annotate" data-id="${photo.id}">Mark frame</button></li>`).join("")}</ol>` : `<div class="inline-empty"><p>No chosen frames yet.</p><button class="button button-secondary" data-action="view" data-view="contact">Return to contact sheet</button></div>`}</section>
    </section>`;
  }

  private renderSheet(session: WalkSession): string {
    const displayPhotos = (session.photos.some((photo) => photo.chosen) ? session.photos.filter((photo) => photo.chosen) : session.photos).slice(0, 4);
    return `<section class="work-section" aria-labelledby="sheet-heading"><div class="work-heading"><div><p class="eyebrow">Step 04 · one-page record</p><h2 id="sheet-heading">Session sheet</h2><p class="heading-note">A compact record to keep beside your editor or print for the next walk.</p></div>${session.completedAt ? `<span class="complete-stamp">Walk complete</span>` : ""}</div>
      <article class="sheet-preview" id="print-sheet"><header><span>PHOTO WALK SCRATCHBOOK</span><span>${formatDate(session.createdAt)}</span></header><h3>${escapeHtml(session.title)}</h3><p class="sheet-place">${escapeHtml(session.location || "Location unrecorded")} · ${escapeHtml(session.conditions || "Conditions unrecorded")}</p><blockquote>“${escapeHtml(session.prompt)}”</blockquote><p class="sheet-constraint">${escapeHtml(session.constraint)}</p>${displayPhotos.length ? `<div class="sheet-photos">${displayPhotos.map((photo) => `<figure><img src="${this.photoUrl(photo)}" width="${photo.width}" height="${photo.height}" alt="Session select ${escapeHtml(photo.name)}"><figcaption>${escapeHtml(photo.framingNote || photo.name)}</figcaption></figure>`).join("")}</div>` : `<div class="sheet-no-photo">No photographs imported yet. The written field record can still be printed.</div>`}<div class="sheet-notes"><div><strong>Intention</strong><p>${escapeHtml(session.intention || "No intention recorded.")}</p></div><div><strong>Camera / reflection</strong><p>${escapeHtml([session.cameraNotes, session.reflection].filter(Boolean).join(" · ") || "No notes recorded.")}</p></div></div><footer>Private field record · photographs remain on this device</footer></article>
      <div class="sheet-actions"><button class="button button-secondary" data-action="print">Print / save PDF</button>${this.license.valid ? `<button class="button button-primary" data-action="export-sheet">Export annotated PNG</button>` : `<button class="button button-primary" data-action="kit">Unlock PNG export · $12</button>`}<button class="button button-quiet" data-action="toggle-complete">${session.completedAt ? "Mark walk in progress" : "Mark walk complete"}</button></div>
      ${!this.license.valid ? `<p class="paywall-note"><span aria-hidden="true">✦</span> Printing and complete JSON backup stay free. The one-time Full field kit adds a polished annotated PNG, 9 more prompts, custom cards, and text marks.</p>` : ""}
    </section>`;
  }

  private renderDialogs(): string {
    return `<dialog id="new-walk-dialog" class="paper-dialog"><form method="dialog" id="new-walk-form"><div class="dialog-heading"><div><p class="eyebrow">New field record</p><h2>Begin a photo walk</h2></div><button class="icon-button" value="cancel" aria-label="Close new walk dialog">×</button></div><label for="walk-title">Walk title</label><input id="walk-title" name="title" required maxlength="80" value="${new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(new Date())} walk"><div class="split-fields"><label for="walk-place">Place <span>optional</span><input id="walk-place" name="location" maxlength="80" autocomplete="off"></label><label for="walk-conditions">Light / weather <span>optional</span><input id="walk-conditions" name="conditions" maxlength="80" autocomplete="off"></label></div><fieldset><legend>First prompt</legend>${FREE_PROMPTS.slice(0, 3).map((prompt, index) => `<label class="prompt-radio"><input type="radio" name="prompt" value="${prompt.id}" ${index === 0 ? "checked" : ""}><span><strong>${escapeHtml(prompt.prompt)}</strong><small>${escapeHtml(prompt.constraint)}</small></span></label>`).join("")}</fieldset><div class="dialog-actions"><button class="button button-quiet" value="cancel">Cancel</button><button class="button button-primary" value="start">Start this walk</button></div></form></dialog>
      <dialog id="prompt-dialog" class="paper-dialog deck-dialog"><div class="dialog-heading"><div><p class="eyebrow">Pocket prompt deck</p><h2>Choose one attention</h2></div><button class="icon-button" data-close-dialog aria-label="Close prompt deck">×</button></div><div class="deck-list">${FULL_PROMPTS.map((prompt) => `<button class="deck-card ${prompt.paid && !this.license.valid ? "locked" : ""}" data-action="select-prompt" data-id="${prompt.id}" ${prompt.paid && !this.license.valid ? "aria-describedby=deck-lock-note" : ""}><span>${prompt.family}</span><strong>${escapeHtml(prompt.prompt)}</strong><small>${escapeHtml(prompt.constraint)}</small>${prompt.paid && !this.license.valid ? `<em>Full kit</em>` : ""}</button>`).join("")}</div>${!this.license.valid ? `<p id="deck-lock-note" class="dialog-note">Six prompts are included. The complete 15-card deck is in the one-time Full field kit.</p>` : `<form id="custom-prompt-form" class="custom-prompt"><h3>Write a custom card</h3><label>Prompt<input name="prompt" required maxlength="100"></label><label>Constraint<input name="constraint" required maxlength="180"></label><button class="button button-secondary">Use custom card</button></form>`}</dialog>
      <dialog id="kit-dialog" class="paper-dialog kit-dialog"><div class="dialog-heading"><div><p class="eyebrow">Field kit</p><h2>Settings, backup, and license</h2></div><button class="icon-button" data-close-dialog aria-label="Close field kit">×</button></div><section><h3>Your local archive</h3><p>Export a complete JSON backup with original photographs and marks. Importing replaces the walks currently on this device after confirmation.</p><div class="button-row"><button class="button button-secondary" data-action="export-backup">Export JSON backup</button><label class="button button-quiet file-button" for="backup-input">Import backup<input id="backup-input" type="file" accept="application/json,.json"></label></div></section><section class="license-panel"><p class="eyebrow">One-time purchase</p><h3>Full field kit · $12 once</h3><p>Unlock all 15 prompt cards, custom prompts, text marks, and polished annotated PNG session sheets. No subscription. Core annotations, printing, and JSON export stay free.</p><div id="license-status" class="license-status">${this.licenseMarkup()}</div><a class="button button-primary" href="${CHECKOUT_URL}">${this.license.valid ? "View purchase page" : "Buy the Full field kit"}</a><details><summary>Have a license? Restore it</summary><form id="license-form"><label for="license-token">License token</label><input id="license-token" name="license" required autocomplete="off" spellcheck="false"><button class="button button-secondary">Verify and restore</button></form></details><p class="merchant-note">Sociobot/Dodo is the merchant of record. Refunds are handled there and revoke the license automatically. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p></section></dialog>`;
  }

  private licenseMarkup(): string {
    if (this.license.checking) return `<span class="status-dot checking"></span> Checking this device’s license…`;
    if (this.license.valid) return `<span class="status-dot valid"></span> Full field kit active on this device.`;
    if (this.license.reason && this.license.reason !== "offline") return `<span class="status-dot invalid"></span> License no longer active (${escapeHtml(this.license.reason.replace(/_/g, " "))}).`;
    if (this.license.reason === "offline") return `<span class="status-dot"></span> Connect once to verify this license.`;
    return `<span class="status-dot"></span> Free field kit active.`;
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => element.addEventListener("click", (event) => void this.handleAction(event)));
    this.root.querySelectorAll<HTMLButtonElement>("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog")?.close()));
    this.root.querySelectorAll<HTMLInputElement>("input[type=file]").forEach((input) => input.addEventListener("click", () => { input.value = ""; }));
    this.root.querySelectorAll<HTMLInputElement>("#photo-input, #photo-input-empty").forEach((input) => input.addEventListener("change", () => void this.importPhotos(input.files)));
    this.root.querySelector<HTMLInputElement>("#backup-input")?.addEventListener("change", (event) => void this.importBackup((event.currentTarget as HTMLInputElement).files?.[0]));
    this.root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-session-field]").forEach((input) => input.addEventListener("input", () => this.updateSessionField(input.dataset.field ?? "", input.value)));
    this.root.querySelectorAll<HTMLTextAreaElement>("[data-photo-field]").forEach((input) => input.addEventListener("input", () => this.updatePhotoField(input.dataset.id ?? "", input.dataset.photoField ?? "", input.value)));
    this.root.querySelector<HTMLFormElement>("#new-walk-form")?.addEventListener("submit", (event) => this.createWalk(event));
    this.root.querySelector<HTMLFormElement>("#custom-prompt-form")?.addEventListener("submit", (event) => this.createCustomPrompt(event));
    this.root.querySelector<HTMLFormElement>("#license-form")?.addEventListener("submit", (event) => void this.restoreLicense(event));
    this.root.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  }

  private async handleAction(event: Event): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    const action = target.dataset.action;
    if (action === "home") { this.state.activeSessionId = undefined; await this.persist(); this.render(); }
    else if (action === "new-walk") this.openDialog("new-walk-dialog");
    else if (action === "browse-prompts") this.openDialog("prompt-dialog");
    else if (action === "kit") this.openDialog("kit-dialog");
    else if (action === "open-session") { this.state.activeSessionId = target.dataset.id; this.state.activeView = "prompt"; await this.persist(); this.render(); }
    else if (action === "view") { this.state.activeView = target.dataset.view as ScratchbookState["activeView"]; await this.persist(); this.render(); }
    else if (action === "next-prompt") this.setPrompt(nextPrompt(this.activeSession?.promptId ?? "", this.license.valid).id);
    else if (action === "select-prompt") { const prompt = promptById(target.dataset.id ?? ""); if (prompt.paid && !this.license.valid) { this.openDialog("kit-dialog"); } else this.setPrompt(prompt.id); }
    else if (action === "choose-photo") { const input = target as HTMLInputElement; this.mutatePhoto(target.dataset.id ?? "", (photo) => { photo.chosen = input.checked; }); await this.persist(`${input.checked ? "Chosen" : "Unchosen"} frame saved.`); this.render(); }
    else if (action === "delete-photo") await this.deletePhoto(target.dataset.id ?? "");
    else if (action === "annotate") this.openAnnotator(target.dataset.id ?? "");
    else if (action === "delete-session") await this.deleteSession();
    else if (action === "toggle-complete") { const session = this.activeSession; if (session) { session.completedAt = session.completedAt ? undefined : new Date().toISOString(); session.updatedAt = new Date().toISOString(); await this.persist(session.completedAt ? "Walk marked complete." : "Walk returned to progress."); this.render(); } }
    else if (action === "print") window.print();
    else if (action === "export-sheet") await this.exportSheet();
    else if (action === "export-backup") await this.exportBackup();
    else if (action === "theme") this.toggleTheme();
    else if (action === "update-app") navigator.serviceWorker.getRegistration().then((registration) => registration?.waiting?.postMessage({ type: "SKIP_WAITING" }));
  }

  private openDialog(id: string): void {
    const dialog = this.root.querySelector<HTMLDialogElement>(`#${id}`);
    if (dialog && !dialog.open) dialog.showModal();
  }

  private createWalk(event: SubmitEvent): void {
    event.preventDefault();
    const submitter = event.submitter as HTMLButtonElement | null;
    if (submitter?.value !== "start") return;
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const prompt = promptById(String(data.get("prompt") ?? FREE_PROMPTS[0].id));
    const now = new Date().toISOString();
    const session: WalkSession = { id: uid("walk"), title: String(data.get("title") ?? "Photo walk").trim(), createdAt: now, updatedAt: now, location: String(data.get("location") ?? "").trim(), conditions: String(data.get("conditions") ?? "").trim(), promptId: prompt.id, prompt: prompt.prompt, constraint: prompt.constraint, intention: "", reflection: "", cameraNotes: "", photos: [] };
    this.state.sessions.push(session);
    this.state.activeSessionId = session.id;
    this.state.activeView = "prompt";
    void this.persist("New walk saved.");
    this.render();
  }

  private setPrompt(id: string): void {
    const session = this.activeSession;
    const prompt = promptById(id);
    if (!session) return;
    session.promptId = prompt.id; session.prompt = prompt.prompt; session.constraint = prompt.constraint; session.updatedAt = new Date().toISOString();
    void this.persist("Prompt changed.");
    this.render();
    this.root.querySelector<HTMLDialogElement>("#prompt-dialog")?.close();
  }

  private createCustomPrompt(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.license.valid || !this.activeSession) return;
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const prompt = String(data.get("prompt") ?? "").trim();
    const constraint = String(data.get("constraint") ?? "").trim();
    if (!prompt || !constraint) return;
    Object.assign(this.activeSession, { promptId: `custom-${crypto.randomUUID()}`, prompt, constraint, updatedAt: new Date().toISOString() });
    void this.persist("Custom prompt saved.");
    this.render();
  }

  private updateSessionField(field: string, value: string): void {
    const session = this.activeSession;
    if (!session || !["intention", "reflection", "cameraNotes", "location", "conditions"].includes(field)) return;
    (session as unknown as Record<string, string>)[field] = value;
    session.updatedAt = new Date().toISOString();
    this.scheduleSave();
  }

  private updatePhotoField(id: string, field: string, value: string): void {
    if (!["framingNote", "exposureNote"].includes(field)) return;
    this.mutatePhoto(id, (photo) => { (photo as unknown as Record<string, unknown>)[field] = value; });
    this.scheduleSave();
  }

  private scheduleSave(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.persist("Notes saved."), 400);
  }

  private mutatePhoto(id: string, mutate: (photo: PhotoRecord) => void): void {
    const photo = this.activeSession?.photos.find((item) => item.id === id);
    if (!photo) return;
    mutate(photo);
    if (this.activeSession) this.activeSession.updatedAt = new Date().toISOString();
  }

  private async importPhotos(files: FileList | null): Promise<void> {
    const session = this.activeSession;
    if (!session || !files?.length) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    Array.from(files).forEach((file) => ACCEPTED_TYPES.has(file.type) ? accepted.push(file) : rejected.push(file.name));
    const error = this.root.querySelector<HTMLElement>("#photo-error");
    if (rejected.length && error) { error.hidden = false; error.textContent = `${rejected.join(", ")} could not be imported. Use camera JPEG, PNG, or WebP previews; RAW files are not supported.`; }
    for (const file of accepted) {
      try {
        const bitmap = await createImageBitmap(file);
        session.photos.push({ id: uid("photo"), name: file.name, type: file.type, blob: file, width: bitmap.width, height: bitmap.height, importedAt: new Date().toISOString(), chosen: false, framingNote: "", exposureNote: "", marks: [] });
        bitmap.close();
      } catch { rejected.push(file.name); }
    }
    session.updatedAt = new Date().toISOString();
    try { await this.persist(`${accepted.length} photograph${accepted.length === 1 ? "" : "s"} imported locally.`); this.render(); }
    catch { if (error) { error.hidden = false; error.textContent = "The photographs could not be saved. Free some browser storage, then import a smaller set."; } }
  }

  private async deletePhoto(id: string): Promise<void> {
    const session = this.activeSession;
    const photo = session?.photos.find((item) => item.id === id);
    if (!session || !photo || !confirm(`Remove “${photo.name}” and all of its marks from this walk? The original camera file is not affected.`)) return;
    session.photos = session.photos.filter((item) => item.id !== id);
    session.updatedAt = new Date().toISOString();
    await this.persist("Photograph removed from this walk.");
    this.render();
  }

  private async deleteSession(): Promise<void> {
    const session = this.activeSession;
    if (!session || !confirm(`Delete “${session.title}”, its local photo copies, and all marks? This cannot be undone.`)) return;
    this.state.sessions = this.state.sessions.filter((item) => item.id !== session.id);
    this.state.activeSessionId = undefined;
    await this.persist("Walk deleted.");
    this.render();
  }

  private openAnnotator(photoId: string): void {
    const photo = this.activeSession?.photos.find((item) => item.id === photoId);
    if (!photo) return;
    const url = URL.createObjectURL(photo.blob);
    const dialog = document.createElement("dialog");
    dialog.className = "annotator-dialog";
    dialog.innerHTML = `<div class="annotator-head"><div><p class="eyebrow">Frame annotation</p><h2>${escapeHtml(photo.name)}</h2></div><button class="icon-button" data-close aria-label="Close annotation editor">×</button></div><div class="annotation-tools" role="toolbar" aria-label="Annotation tools"><button class="tool active" data-tool="pen" aria-pressed="true"><span aria-hidden="true">✎</span> Pen</button><button class="tool" data-tool="frame" aria-pressed="false"><span aria-hidden="true">□</span> Frame</button><button class="tool" data-tool="arrow" aria-pressed="false"><span aria-hidden="true">↗</span> Arrow</button>${this.license.valid ? `<button class="tool" data-tool="text" aria-pressed="false"><span aria-hidden="true">T</span> Text</button><label class="text-mark-input">Label<input id="mark-text" maxlength="28" value="Look here"></label>` : `<button class="tool locked-tool" data-open-kit><span aria-hidden="true">T</span> Text · Full kit</button>`}<label class="color-select">Ink<select id="mark-color"><option value="#f3eedc">Field white</option><option value="#c97822" selected>Marigold</option><option value="#244c3a">Leaf green</option><option value="#9c3c32">Brick</option></select></label><span class="tool-spacer"></span><button class="tool" data-center-frame>Center frame</button><button class="tool" data-undo ${photo.marks.length ? "" : "disabled"}>Undo</button><button class="tool" data-clear ${photo.marks.length ? "" : "disabled"}>Clear marks</button></div><div class="annotation-stage" tabindex="0" role="img" aria-label="${escapeHtml(photo.name)} annotation canvas. Use Pen, Frame, or Arrow with a pointer. Press R to add a centered frame and Control Z to undo."><img src="${url}" alt=""><canvas></canvas></div><div class="annotation-foot"><p><strong>${photo.marks.length}</strong> saved marks · shortcuts: R center frame, Ctrl Z undo</p><button class="button button-primary" data-close>Done marking</button></div><div class="sr-only" aria-live="polite" data-annotation-live></div>`;
    document.body.append(dialog);
    dialog.showModal();
    const stage = dialog.querySelector<HTMLElement>(".annotation-stage");
    const canvas = dialog.querySelector<HTMLCanvasElement>("canvas");
    if (!stage || !canvas) return;
    let tool: Tool = "pen";
    let activeMark: Mark | null = null;
    let box = containBox(photo.width, photo.height, stage.clientWidth, stage.clientHeight);
    const redraw = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      const width = stage.clientWidth; const height = stage.clientHeight;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      box = containBox(photo.width, photo.height, width, height);
      drawMarks(context, photo.marks, box);
      const count = dialog.querySelector(".annotation-foot strong"); if (count) count.textContent = String(photo.marks.length);
      dialog.querySelectorAll<HTMLButtonElement>("[data-undo],[data-clear]").forEach((button) => { button.disabled = photo.marks.length === 0; });
    };
    const saveMarks = () => { void this.persist("Frame marks saved."); announce("Frame marks saved."); };
    const addCenterFrame = () => { photo.marks.push({ id: uid("mark"), tool: "frame", color: (dialog.querySelector<HTMLSelectElement>("#mark-color")?.value ?? "#c97822"), points: [{ x: .12, y: .12 }, { x: .88, y: .88 }] }); redraw(); saveMarks(); };
    const pointFromEvent = (event: PointerEvent) => normalizePoint(event.clientX, event.clientY, stage, box);
    canvas.addEventListener("pointerdown", (event) => {
      const point = pointFromEvent(event); if (!point) return;
      canvas.setPointerCapture(event.pointerId);
      const color = dialog.querySelector<HTMLSelectElement>("#mark-color")?.value ?? "#c97822";
      if (tool === "text") {
        const text = dialog.querySelector<HTMLInputElement>("#mark-text")?.value.trim();
        if (text) { photo.marks.push({ id: uid("mark"), tool, color, points: [point], text }); redraw(); saveMarks(); }
        return;
      }
      activeMark = { id: uid("mark"), tool, color, points: [point] };
      photo.marks.push(activeMark);
      redraw();
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!activeMark || !canvas.hasPointerCapture(event.pointerId)) return;
      const events = activeMark.tool === "pen" && "getCoalescedEvents" in event ? event.getCoalescedEvents() : [event];
      events.forEach((item) => { const point = normalizePoint(item.clientX, item.clientY, stage, box); if (point) activeMark?.points.push(point); });
      if (activeMark.tool !== "pen" && activeMark.points.length > 2) activeMark.points.splice(1, activeMark.points.length - 2);
      redraw();
    });
    canvas.addEventListener("pointerup", (event) => { if (!activeMark) return; const point = pointFromEvent(event); if (point && activeMark.tool !== "pen") activeMark.points[1] = point; if (activeMark.points.length < 2) photo.marks.pop(); activeMark = null; redraw(); saveMarks(); });
    dialog.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((button) => button.addEventListener("click", () => { tool = button.dataset.tool as Tool; dialog.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((item) => { const selected = item === button; item.classList.toggle("active", selected); item.setAttribute("aria-pressed", String(selected)); }); }));
    dialog.querySelectorAll<HTMLElement>("[data-close]").forEach((element) => element.addEventListener("click", () => dialog.close()));
    dialog.querySelector<HTMLElement>("[data-center-frame]")?.addEventListener("click", addCenterFrame);
    dialog.querySelector<HTMLElement>("[data-undo]")?.addEventListener("click", () => { photo.marks.pop(); redraw(); saveMarks(); });
    dialog.querySelector<HTMLElement>("[data-clear]")?.addEventListener("click", () => { if (confirm(`Clear all marks from “${photo.name}”?`)) { photo.marks = []; redraw(); saveMarks(); } });
    dialog.querySelector<HTMLElement>("[data-open-kit]")?.addEventListener("click", () => { dialog.close(); this.openDialog("kit-dialog"); });
    stage.addEventListener("keydown", (event) => { if (event.key.toLowerCase() === "r") { event.preventDefault(); addCenterFrame(); } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); photo.marks.pop(); redraw(); saveMarks(); } });
    const resizeObserver = new ResizeObserver(redraw); resizeObserver.observe(stage); redraw(); stage.focus();
    dialog.addEventListener("close", () => { resizeObserver.disconnect(); URL.revokeObjectURL(url); dialog.remove(); this.render(); });
  }

  private async exportSheet(): Promise<void> {
    const session = this.activeSession;
    if (!session || !this.license.valid) return;
    const button = this.root.querySelector<HTMLButtonElement>("[data-action=export-sheet]");
    if (button) { button.disabled = true; button.textContent = "Drawing session sheet…"; }
    try { downloadBlob(await createSessionSheet(session), `${safeFilename(session.title)}-session-sheet.png`); announce("Annotated PNG session sheet exported."); }
    catch (error) { announce(error instanceof Error ? error.message : "The session sheet could not be exported."); }
    finally { if (button) { button.disabled = false; button.textContent = "Export annotated PNG"; } }
  }

  private async exportBackup(): Promise<void> {
    const button = this.root.querySelector<HTMLButtonElement>("[data-action=export-backup]");
    if (button) { button.disabled = true; button.textContent = "Preparing backup…"; }
    try { downloadJson(await createBackup(this.state), `photo-walk-scratchbook-${new Date().toISOString().slice(0, 10)}.json`); announce("Complete JSON backup exported."); }
    catch (error) { announce(error instanceof Error ? error.message : "The backup could not be prepared."); }
    finally { if (button) { button.disabled = false; button.textContent = "Export JSON backup"; } }
  }

  private async importBackup(file?: File): Promise<void> {
    if (!file) return;
    try {
      const imported = readBackup(JSON.parse(await file.text()) as unknown);
      if (!confirm(`Replace the ${this.state.sessions.length} walk${this.state.sessions.length === 1 ? "" : "s"} on this device with ${imported.sessions.length} from “${file.name}”?`)) return;
      this.state = imported; await this.persist("Backup restored on this device."); this.render();
    } catch (error) { announce(error instanceof Error ? error.message : "That backup could not be imported."); }
  }

  private async restoreLicense(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    try { this.license = storeLicense(String(data.get("license") ?? "")); this.updateLicenseStatus(); this.license = await verifyLicense(this.license, true); this.render(); this.openDialog("kit-dialog"); }
    catch (error) { announce(error instanceof Error ? error.message : "That license could not be stored."); }
  }

  private updateLicenseStatus(): void {
    const status = this.root.querySelector<HTMLElement>("#license-status");
    if (status) status.innerHTML = this.licenseMarkup();
  }

  private async persist(message?: string): Promise<void> {
    try { await saveState(this.state); if (message) announce(message); }
    catch (error) { announce(error instanceof Error ? error.message : "The latest change could not be saved."); throw error; }
  }

  private toggleTheme(): void {
    const current = document.documentElement.dataset.theme ?? "auto";
    const next = current === "auto" ? "dark" : current === "dark" ? "light" : "auto";
    localStorage.setItem("scratchbook-theme", next);
    document.documentElement.dataset.theme = next;
    announce(`Color theme: ${next}.`);
  }

  private syncTheme(): void {
    document.documentElement.dataset.theme = localStorage.getItem("scratchbook-theme") ?? "auto";
  }

  private attachNetworkState(): void {
    const update = () => { const element = document.querySelector<HTMLElement>("#connection-state"); if (element) { element.innerHTML = `<span aria-hidden="true">●</span> ${navigator.onLine ? "Ready offline" : "Offline · saved locally"}`; element.classList.toggle("offline", !navigator.onLine); } };
    window.addEventListener("online", update); window.addEventListener("offline", update); update();
  }

  private registerServiceWorker(): void {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) this.showUpdateToast();
      registration.addEventListener("updatefound", () => registration.installing?.addEventListener("statechange", () => { if (registration.waiting && navigator.serviceWorker.controller) this.showUpdateToast(); }));
      navigator.serviceWorker.addEventListener("message", (event) => { if (event.data?.type === "UPDATE_AVAILABLE") this.showUpdateToast(); });
      const hadController = Boolean(navigator.serviceWorker.controller);
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !refreshing) { refreshing = true; location.reload(); } });
    }).catch(() => { /* The app remains usable when service workers are unavailable. */ });
  }

  private showUpdateToast(): void {
    const toast = document.querySelector<HTMLElement>("#update-toast");
    if (toast) toast.hidden = false;
  }
}
