// Real-browser check: signup -> real SMTP email -> click verify link -> forgot password ->
// real reset email -> set new password -> login with it. Screenshots saved alongside.
const { chromium } = require("/home/claude/masters-platform/frontend/node_modules/playwright");
const fs = require("fs");
const path = require("path");

const WEB = "http://127.0.0.1:3181";
const API = "http://127.0.0.1:8011";
const MAIL = "/tmp/claude-0/e2e/mail";
const SHOTS = "/tmp/claude-0/e2e/shots";
fs.mkdirSync(SHOTS, { recursive: true });

function latestLink(route) {
  const files = fs.readdirSync(MAIL).sort((a, b) => parseInt(a) - parseInt(b));
  const body = fs.readFileSync(path.join(MAIL, files[files.length - 1]), "utf8");
  const decoded = body.includes("Content-Transfer-Encoding: base64")
    ? Buffer.from(body.replace(/\r/g, "").split("\n\n").slice(1).join(""), "base64").toString("utf8")
    : body;
  const link = decoded.split(/\s+/).find((w) => w.startsWith(WEB + route));
  if (!link) throw new Error("no link for " + route + " in:\n" + decoded);
  return { link, count: files.length };
}

(async () => {
  const email = `pilot-${Date.now()}@example.com`;
  const signup = await fetch(API + "/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name: "Pilot User", password: "first-password-1" }),
  });
  if (signup.status !== 201) throw new Error("signup " + signup.status);

  const verify = latestLink("/auth/verify-email#token=");
  console.log("verify email link:", verify.link.replace(/token=.*/, "token=<redacted>"));

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));

  await page.goto(verify.link);
  await page.getByText("Your email is verified.").waitFor({ timeout: 10000 });
  console.log("verify page: success shown; address bar now:", page.url());
  await page.screenshot({ path: SHOTS + "/1-verified-mobile.png" });

  // Replaying the same link must fail and offer a new one.
  const replay = await browser.newPage({ viewport: { width: 390, height: 844 } });
  replay.on("request", (r) => requests.push(r.url()));
  await replay.goto(verify.link);
  await replay.getByText("Send a new link").waitFor({ timeout: 10000 });
  console.log("verify replay: rejected with resend option");
  await replay.screenshot({ path: SHOTS + "/2-verify-replay-mobile.png" });

  await fetch(API + "/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const reset = latestLink("/auth/reset-password#token=");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(reset.link);
  await page.fill("#auth-reset-password", "second-password-2");
  await page.fill("#auth-reset-confirm", "second-password-2");
  await page.screenshot({ path: SHOTS + "/3-reset-form-desktop.png" });
  await page.click("text=Save new password");
  await page.getByText("Password updated").waitFor({ timeout: 10000 });
  console.log("reset page: success shown; address bar now:", page.url());
  await page.screenshot({ path: SHOTS + "/4-reset-done-desktop.png" });

  const login = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "second-password-2" }),
  });
  const me = await fetch(API + "/auth/me", {
    headers: { Authorization: "Bearer " + (await login.json()).access_token },
  }).then((r) => r.json());
  console.log("login with new password:", login.status, "email_verified:", me.email_verified);

  const leaked = requests.filter((u) => u.includes("token="));
  console.log("network requests containing 'token=':", leaked.length);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
