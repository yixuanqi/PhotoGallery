import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
const port = 8794;
const origin = "http://127.0.0.1:" + port;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", "docs"], { stdio: "ignore" });
let browser;
async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { const response = await fetch(origin); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Local static server did not start");
}
async function smokeViewport(viewport, mobile) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") pageErrors.push(message.text()); });
  // Chromium probes favicon.ico by default; the game is intentionally self-contained and ships no favicon.
  await page.route("**/favicon.ico", route => route.fulfill({ status: 204, body: "" }));
  page.on("response", response => {
    if (response.status() >= 400 && !new URL(response.url()).pathname.endsWith("/favicon.ico")) {
      pageErrors.push("HTTP " + response.status() + " " + response.url());
    }
  });
  await page.goto(origin + "/ashen-bell-vow/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("#btn-start").waitFor({ state: "visible", timeout: 10000 });
  const initial = await page.evaluate(() => {
    const canvas = document.getElementById("gameCanvas");
    return { title: document.title, canvasWidth: canvas.width, canvasHeight: canvas.height,
      titleVisible: !document.getElementById("title-screen").classList.contains("hidden"),
      touchControlsDisplay: getComputedStyle(document.getElementById("touch-controls")).display };
  });
  assert.match(initial.title, /灰钟残誓/);
  assert.ok(initial.canvasWidth >= 320 && initial.canvasHeight >= 240, "canvas must initialize");
  assert.equal(initial.titleVisible, true, "title screen must be visible before start");
  if (mobile) assert.equal(initial.touchControlsDisplay, "flex", "touch controls must be visible on touch devices");
  await page.locator("#btn-start").click();
  await page.waitForFunction(() => {
    const title = document.getElementById("title-screen");
    return title && title.classList.contains("hidden");
  }, null, { timeout: 8000 });
  await page.waitForTimeout(250);
  const playing = await page.evaluate(() => ({
    titleHidden: document.getElementById("title-screen").classList.contains("hidden"),
    hpText: document.getElementById("hp-text").textContent.trim(),
    canvasWidth: document.getElementById("gameCanvas").width,
    canvasHeight: document.getElementById("gameCanvas").height,
    touchControlsDisplay: getComputedStyle(document.getElementById("touch-controls")).display
  }));
  assert.equal(playing.titleHidden, true, "start action must dismiss title overlay");
  assert.ok(playing.hpText.length > 0, "player HUD must initialize");
  assert.ok(playing.canvasWidth >= 320 && playing.canvasHeight >= 240, "canvas must remain valid");
  if (mobile) assert.equal(playing.touchControlsDisplay, "flex", "touch controls must remain available");
  assert.deepEqual(pageErrors, [], "game must not emit uncaught page or console errors");
  await page.screenshot({ path: resolve("screenshots/ashen-bell-vow-" + (mobile ? "mobile" : "desktop") + ".png") });
  console.log("PASS Ashen Bell Vow", mobile ? "mobile" : "desktop", viewport.width + "x" + viewport.height);
  await page.close();
}
try {
  await waitForServer();
  await mkdir(resolve("screenshots"), { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  await smokeViewport({ width: 1365, height: 900 }, false);
  await smokeViewport({ width: 390, height: 844 }, true);
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
