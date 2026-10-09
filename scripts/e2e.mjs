// End-to-end proof of the whole OAuth flow, driven through a real browser.
//   bunx playwright install chromium   (once)
//   node scripts/e2e.mjs
import { chromium } from "playwright";

const B = process.env.BASE ?? "http://localhost:3100";
const ok = (c, m) => console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
let failures = 0;
const check = (c, m) => { if (!c) failures++; ok(c, m); };

const browser = await chromium.launch();
const page = await browser.newPage();

console.log("\n--- Phase 1: discovery + keys");
const disco = await (await page.request.get(B + "/.well-known/openid-configuration")).json();
check(disco.issuer === B, "discovery document advertises the issuer");
check(disco.code_challenge_methods_supported.includes("S256"), "discovery advertises PKCE S256");
const jwks = await (await page.request.get(B + "/.well-known/jwks.json")).json();
check(jwks.keys.length === 1 && !("d" in jwks.keys[0]), "JWKS exposes public key only (no private 'd')");

console.log("\n--- Phase 2: authorization code + PKCE through the browser");
await page.goto(B + "/client");
await page.click("text=Sign in with YourID");
await page.waitForURL("**/login**");
check(page.url().includes("/login"), "unauthenticated /authorize redirects to the provider's login");

await page.fill('input[name="email"]', "jun@example.com");
await page.fill('input[name="password"]', "hunter2");
await page.click('button[type="submit"]');
await page.waitForURL("**/consent**");
check(page.url().includes("/consent"), "after login the consent screen appears");
check(await page.locator("text=See your email address").isVisible(), "consent lists scopes in human language");

await page.click('button[value="allow"]');
await page.waitForURL("**/client");
const body = await page.textContent("body");
check(body.includes("access_token"), "client received an access_token");
check(body.includes("refresh_token"), "client received a refresh_token");
check(body.includes("jun@example.com"), "/userinfo returned the email claim");
check(body.includes("Jun Guo"), "verified id_token carries the profile claims");

console.log("\n--- Phase 3: attacks must fail");
await page.goto(B + "/client/replay-code");
await page.waitForURL("**/client");
check((await page.textContent("body")).includes("code replay"), "replaying a used authorization code is rejected");

await page.goto(B + "/client/refresh");          // rotate once
await page.waitForURL("**/client");
await page.goto(B + "/client/refresh?replay=1"); // present the retired token
await page.waitForURL("**/client");
check((await page.textContent("body")).includes("reuse"), "reusing a rotated refresh token revokes the family");

console.log("\n--- Phase 4: direct endpoint checks");
const badRedirect = await page.request.get(
  B + "/oauth/authorize?response_type=code&client_id=demo-client" +
  "&redirect_uri=http://evil.example.com/steal&scope=openid&state=x" +
  "&code_challenge=abc&code_challenge_method=S256");
check(badRedirect.status() === 400, "unregistered redirect_uri is rejected (no open redirect)");

const noPkce = await page.request.get(
  B + "/oauth/authorize?response_type=code&client_id=demo-client" +
  "&redirect_uri=" + encodeURIComponent(B + "/client/callback") + "&scope=openid&state=x");
check(noPkce.status() === 400, "authorize without PKCE is rejected");

const badToken = await page.request.get(B + "/oauth/userinfo", {
  headers: { authorization: "Bearer not.a.real.token" }, failOnStatusCode: false });
check(badToken.status() === 401, "/userinfo rejects a forged bearer token");

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
