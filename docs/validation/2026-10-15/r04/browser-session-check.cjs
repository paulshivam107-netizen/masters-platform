// R04 real-browser session check. Needs a production build served on WEB and the API on API
// started with ACCESS_TOKEN_EXPIRE_MINUTES=1 (see README.md in this folder). Run from frontend/:
//   node ../docs/validation/2026-10-15/r04/browser-session-check.cjs
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd()] }));
const OUT = process.env.OUT_DIR || __dirname;
const WEB = process.env.WEB_URL || "http://127.0.0.1:3401";
const API = process.env.API_URL || "http://127.0.0.1:8401";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " :: " + detail : ""}`);
};
const workspaceVisible = (page, timeout = 8000) =>
  page.getByTestId("profile-menu-trigger").waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
const loginVisible = (page, timeout = 8000) =>
  page.getByTestId("auth-login-heading").waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const apiLog = [];
  context.on("response", (r) => {
    if (r.url().startsWith(API)) apiLog.push(`${new Date().toISOString().slice(11, 19)} ${r.request().method()} ${r.url().slice(API.length)} -> ${r.status()}`);
  });
  const page = await context.newPage();
  const email = `r04-${Date.now()}@example.com`;

  // 1. Signup
  await page.goto(`${WEB}/auth?mode=signup&next=%2Fapp`);
  await page.locator('[data-testid="auth-signup-heading"], [data-testid="auth-login-heading"]').first().waitFor({ timeout: 10000 });
  if (!(await page.getByTestId("auth-signup-heading").isVisible().catch(() => false))) {
    await page.getByTestId("auth-go-signup").click();
  }
  await page.getByTestId("auth-signup-name").fill("R04 Tester");
  await page.getByTestId("auth-signup-email").fill(email);
  await page.getByTestId("auth-signup-password").fill("Sup3r-Secret-pass");
  await page.getByTestId("auth-signup-confirm-password").fill("Sup3r-Secret-pass");
  await page.getByTestId("auth-signup-submit").click();
  await page.waitForTimeout(1500);
  if (!(await workspaceVisible(page, 3000))) await page.goto(`${WEB}/app`);
  check("signup reaches workspace", await workspaceVisible(page));
  await page.screenshot({ path: `${OUT}/01-after-signup.png` });

  // 2. Storage + cookie inspection
  const storage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const tokenish = Object.entries(storage).filter(([k, v]) => /token|refresh|jwt|bearer/i.test(k) || /eyJ[A-Za-z0-9_-]{10,}\./.test(String(v)));
  check("localStorage holds no tokens", tokenish.length === 0, `keys=${JSON.stringify(Object.keys(storage))}`);
  const sessionKeys = await page.evaluate(() => Object.keys(sessionStorage));
  check("sessionStorage holds no tokens", !sessionKeys.some((k) => /token|refresh/i.test(k)), `keys=${JSON.stringify(sessionKeys)}`);
  const docCookie = await page.evaluate(() => document.cookie);
  check("document.cookie cannot see refresh cookie", !/masters_refresh/.test(docCookie), `document.cookie=${JSON.stringify(docCookie)}`);
  const cookies = (await context.cookies()).filter((c) => c.domain === "127.0.0.1" && c.name === "masters_refresh");
  const rc = cookies.find((c) => c.name === "masters_refresh");
  check("refresh cookie exists, HttpOnly, path /auth, SameSite Lax",
    rc && rc.httpOnly && rc.path === "/auth" && rc.sameSite === "Lax",
    rc ? `httpOnly=${rc.httpOnly} path=${rc.path} sameSite=${rc.sameSite} secure=${rc.secure} expiresInDays=${((rc.expires * 1000 - Date.now()) / 864e5).toFixed(1)}` : "missing");

  // 3. Reload keeps session (cookie restore)
  await page.reload();
  await page.waitForTimeout(500);
  const rc2 = (await context.cookies()).find((c) => c.name === "masters_refresh");
  check("reload rotated the refresh cookie", rc && rc2 && rc2.value !== rc.value);
  check("reload keeps user signed in (cookie restore)", await workspaceVisible(page));
  await page.screenshot({ path: `${OUT}/02-after-reload.png` });

  // 4. Access token expiry -> recovered via refresh (ACCESS_TOKEN_EXPIRE_MINUTES=1)
  console.log("waiting 70s for access token expiry...");
  await page.waitForTimeout(70000);
  const mark = apiLog.length;
  await page.getByTestId("profile-menu-trigger").click();
  await page.getByTestId("profile-menu-go-profile").click();
  await page.getByTestId("profile-save-button").click();
  await page.waitForTimeout(2500);
  const saved = apiLog.slice(mark).some((l) => /PUT \/auth\/profile -> 200/.test(l));
  check("profile saved after access token expired", saved);
  await page.screenshot({ path: `${OUT}/03-saved-after-token-expiry.png` });
  const after = apiLog.slice(mark);
  console.log(after.join("\n"));
  const got401 = after.some((l) => / -> 401$/.test(l) && !/\/auth\/refresh/.test(l));
  const refreshed = after.some((l) => /POST \/auth\/refresh -> 200/.test(l));
  check("expired access token recovered via refresh", got401 && refreshed && (await workspaceVisible(page, 2000)), `401=${got401} refresh200=${refreshed}`);

  // 5. Two tabs: logout in one signs out the other
  const page2 = await context.newPage();
  await page2.goto(`${WEB}/app`);
  check("second tab restores the same session", await workspaceVisible(page2));
  await page.getByTestId("profile-menu-trigger").click();
  await page.getByTestId("profile-menu-logout").click();
  await page.waitForTimeout(1500);
  const p1Out = !(await workspaceVisible(page, 1500));
  const p2Out = !(await workspaceVisible(page2, 500)) || (await page2.getByTestId("profile-menu-trigger").isHidden());
  check("logout signs out tab 1", p1Out);
  check("logout in tab 1 signs out tab 2 (BroadcastChannel)", p2Out, `tab2 url=${page2.url()}`);
  await page2.screenshot({ path: `${OUT}/04-tab2-after-logout-in-tab1.png` });
  const rcAfter = ((await context.cookies()).filter((c) => c.domain === "127.0.0.1" && c.name === "masters_refresh")).find((c) => c.name === "masters_refresh");
  check("logout cleared the refresh cookie", !rcAfter);

  // 6. Reload after logout stays signed out
  await page.goto(`${WEB}/app`);
  await page.waitForTimeout(2000);
  check("reload after logout stays signed out", !(await workspaceVisible(page, 2000)), `url=${page.url()}`);
  await page.screenshot({ path: `${OUT}/05-reload-after-logout.png` });

  // 7. Old (pre-logout) refresh cookie is dead server-side: replay it
  if (rc) {
    const replay = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { Cookie: `masters_refresh=${rc.value}`, Origin: WEB } });
    check("replaying an old (rotated) refresh cookie after logout is rejected", replay.status === 401, `status=${replay.status}`);
  }
  // 8. Cross-site Origin is rejected
  await page.close();
  console.log("API log:\n" + apiLog.join("\n"));
  await browser.close();
  require("fs").writeFileSync(`${OUT}/results.json`, JSON.stringify({ email, results, apiLog }, null, 2));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
