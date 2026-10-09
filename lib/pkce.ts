// PKCE: the client invents a random code_verifier, sends only its SHA-256 hash
// (code_challenge) through the untrusted browser, then proves possession of the
// original at the token endpoint. Stops a stolen code being redeemed by anyone else.

function b64url(buf: ArrayBuffer) {
  return Buffer.from(buf).toString("base64url");
}
export function randomVerifier() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}
export async function challengeOf(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(digest);
}
