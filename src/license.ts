import type { LicenseState } from "./types";

const SLUG = "photo-walk-scratchbook";
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${SLUG}`;
const DAY = 86_400_000;
export const CHECKOUT_URL = `https://api.sociobot.in/api/v1/products/${SLUG}/checkout`;

interface Verdict { valid: boolean; reason?: string; checkedAt: number; token: string; }

export function captureReturnedLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get("license");
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete("license");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function initialLicense(): LicenseState {
  const token = localStorage.getItem(TOKEN_KEY);
  let verdict: Verdict | null = null;
  try { verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? "null") as Verdict | null; } catch { verdict = null; }
  const matching = Boolean(token && verdict?.token === token);
  return {
    token,
    valid: Boolean(matching && verdict?.valid),
    checking: false,
    reason: matching ? verdict?.reason : undefined,
    lastChecked: matching ? verdict?.checkedAt : undefined
  };
}

export async function verifyLicense(current: LicenseState, force = false): Promise<LicenseState> {
  if (!current.token) return { token: null, valid: false, checking: false };
  if (!force && current.lastChecked && Date.now() - current.lastChecked < DAY) return current;
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(current.token)}`);
    if (!response.ok) throw new Error("Verification service unavailable");
    const result = await response.json() as { valid: boolean; reason?: string };
    const verdict: Verdict = { valid: result.valid, reason: result.reason, checkedAt: Date.now(), token: current.token };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return { token: current.token, valid: result.valid, checking: false, reason: result.reason, lastChecked: verdict.checkedAt };
  } catch {
    return { ...current, checking: false, reason: current.valid ? current.reason : "offline" };
  }
}

export function storeLicense(token: string): LicenseState {
  const clean = token.trim();
  if (!clean) throw new Error("Paste the license token from your receipt.");
  localStorage.setItem(TOKEN_KEY, clean);
  localStorage.removeItem(VERDICT_KEY);
  return { token: clean, valid: false, checking: true };
}
