import { generateKeyPair, exportJWK, SignJWT, type JWK, type CryptoKey } from "jose";

// The signing key. Public half is published at /.well-known/jwks.json so any
// client can verify an id_token without ever calling us.
type Keys = { privateKey: CryptoKey; publicJwk: JWK; kid: string };
const g = globalThis as unknown as { __oauthkeys?: Promise<Keys> };

export const keys: Promise<Keys> =
  g.__oauthkeys ??
  (g.__oauthkeys = (async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
    const publicJwk = await exportJWK(publicKey);
    const kid = "demo-key-1";
    publicJwk.kid = kid;
    publicJwk.use = "sig";
    publicJwk.alg = "RS256";
    return { privateKey: privateKey as CryptoKey, publicJwk, kid };
  })());

export const ISSUER = process.env.ISSUER ?? "http://localhost:3000";

export async function signJwt(payload: Record<string, unknown>, audience: string, seconds: number) {
  const { privateKey, kid } = await keys;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid, typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .setJti(crypto.randomUUID())
    .sign(privateKey);
}

export const TTL = {
  code: 60,            // one-time, 60 seconds
  access: 15 * 60,     // 15 minutes
  id: 15 * 60,
  refresh: 30 * 24 * 3600,
};
