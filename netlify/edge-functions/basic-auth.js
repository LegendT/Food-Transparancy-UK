// Site-wide HTTP Basic Auth gate for the pre-launch private archive.
//
// Credentials come from Netlify env vars (BASIC_AUTH_USER / BASIC_AUTH_PASS).
// Those vars MUST be scoped to include "Functions" and set in every deploy
// context you want gated (production AND deploy-preview AND branch-deploy): a
// value missing in any context makes Netlify.env.get() return undefined there,
// and this gate then denies (see fail-closed below).
//
// ponytail: single shared credential; switch to Netlify Identity if per-user access is ever needed.
//
// TEMPORARY: this is a pre-launch privacy gate. Remove it (and the
// edge_functions wiring in netlify.toml) at public launch. While it is mounted
// on "/*" the excludedPath list below keeps crawler/TLS paths working.

// Netlify does NOT apply the netlify.toml [[headers]] (CSP, HSTS, etc.) to
// edge-function responses, and this function handles "/*" - so without
// re-applying them here the whole site loses its security-header posture. Keep
// these in sync with netlify.toml.
const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function withSecurity(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Constant-time compare via double-HMAC under a per-request random key. Even if
// the final XOR loop were not constant-time, equal-length digests taken under a
// secret random key leak nothing about the inputs.
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [ha, hb] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(a)),
    crypto.subtle.sign("HMAC", key, enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i += 1) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export default async (request, context) => {
  const user = Netlify.env.get("BASIC_AUTH_USER");
  const pass = Netlify.env.get("BASIC_AUTH_PASS");

  // FAIL CLOSED. An access-control gate must deny when it is not configured,
  // never expose the site. A missing or wrong-scoped credential returns 503.
  if (!user || !pass) {
    return withSecurity(new Response("Service unavailable.", { status: 503 }));
  }

  const unauthorized = () =>
    withSecurity(
      new Response("Authentication required.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Food Transparency UK", charset="UTF-8"' },
      })
    );

  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return unauthorized();

  // Decode the INBOUND credential instead of re-encoding the secret with btoa
  // (btoa throws on any non-Latin1 character, which would crash the whole site).
  let decoded;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)));
  } catch {
    return unauthorized();
  }
  const sep = decoded.indexOf(":");
  const gotUser = sep === -1 ? decoded : decoded.slice(0, sep);
  const gotPass = sep === -1 ? "" : decoded.slice(sep + 1);

  // Evaluate both comparisons (no short-circuit on the user check) before deciding.
  const userOk = await safeEqual(gotUser, user);
  const passOk = await safeEqual(gotPass, pass);
  if (!userOk || !passOk) return unauthorized();

  // Authed: pass through, re-apply the security headers, and forbid shared-cache
  // storage of gated content.
  const response = await context.next();
  const out = withSecurity(response);
  out.headers.set("Cache-Control", "private, no-store");
  out.headers.set("Vary", "Authorization");
  return out;
};

export const config = {
  path: "/*",
  // Keep infrastructure and SEO paths public so they work the moment the gate is
  // removed at launch (and so TLS/ACME and crawlers are never blocked).
  excludedPath: ["/.well-known/*", "/robots.txt", "/sitemap.xml", "/pagefind/*"],
};
