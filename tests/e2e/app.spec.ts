import { expect, test } from "@playwright/test";
import axe from "axe-core";
import { resolve } from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test("creates and restores a deliberate walk", async ({ page }) => {
  await expect(page.locator("h1")).toHaveCount(1);
  await page.getByRole("button", { name: "Start a photo walk" }).click();
  await page.getByLabel("Walk title").fill("Rain edges");
  await page.getByLabel("Place optional").fill("Canal path");
  await page.getByRole("button", { name: "Start this walk" }).click();
  await expect(page.getByRole("heading", { name: "Carry one question outside." })).toBeVisible();
  await page.getByLabel("What will you pay attention to?").fill("Bright edges against wet brick");
  await expect(page.locator("#live-region")).toContainText("Notes saved.");
  await page.reload();
  await expect(page.getByLabel("What will you pay attention to?")).toHaveValue("Bright edges against wet brick");
});

test("imports, chooses, annotates, and records a frame", async ({ page }) => {
  await page.getByRole("button", { name: "Start a photo walk" }).click();
  await page.getByLabel("Walk title").fill("Fern study");
  await page.getByRole("button", { name: "Start this walk" }).click();
  await page.getByRole("button", { name: /02 Contact sheet/ }).click();
  await page.locator("#photo-input-empty").setInputFiles(resolve("public/icons/icon-192.png"));
  await expect(page.getByText("1 frames")).toBeVisible();
  await page.getByText("Mark as chosen").click();
  await page.getByRole("button", { name: /Open icon-192.png/ }).click();
  await page.getByRole("button", { name: "Center frame" }).click();
  await expect(page.getByText("1 saved marks")).toBeVisible();
  await page.getByRole("button", { name: "Done marking" }).click();
  await page.getByRole("button", { name: /03 Field notes/ }).click();
  await page.getByLabel("Framing intention").fill("Hold the fern inside the pale border");
  await page.getByLabel("Camera and exposure notes").fill("1/125 at f/5.6; keep the central edge sharp");
  await page.getByRole("button", { name: /04 Session sheet/ }).click();
  await expect(page.getByText("Hold the fern inside the pale border")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / save PDF" })).toBeVisible();
});

test("has no serious accessibility issues on app and legal pages", async ({ page }) => {
  for (const path of ["/", "/privacy/", "/terms/"]) {
    await page.goto(path);
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(() => (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ impact: string | null }> }> } }).axe.run());
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), JSON.stringify(results.violations, null, 2)).toEqual([]);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
  }
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("scratchbook-theme", "dark"));
  await page.reload();
  await page.addScriptTag({ content: axe.source });
  const darkResults = await page.evaluate(() => (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ impact: string | null }> }> } }).axe.run());
  expect(darkResults.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("captures and verifies a returned purchase license", async ({ page }) => {
  await page.route("https://api.sociobot.in/api/v1/products/photo-walk-scratchbook/verify?license=test-token", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: true, reason: "ok", expires_at: null }) }));
  await page.goto("/?license=test-token");
  await expect(page).not.toHaveURL(/license=/);
  await page.getByRole("button", { name: "Field kit" }).click();
  await expect(page.getByText("Full field kit active on this device.")).toBeVisible();
});

test("works at 390px without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const widths = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  await expect(page.getByRole("button", { name: "Start a photo walk" })).toBeVisible();
});

test("reopens from the service-worker shell while offline", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForFunction(() => "serviceWorker" in navigator);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) await page.reload();
  await expect(page.getByRole("button", { name: "Start a photo walk" })).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Photo Walk Scratchbook" })).toBeVisible();
  await expect(page.getByText(/Offline · saved locally/)).toBeVisible();
  await context.setOffline(false);
});
