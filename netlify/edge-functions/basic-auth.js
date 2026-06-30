// Site-wide HTTP Basic Auth gate. Credentials come from Netlify env vars
// (BASIC_AUTH_USER / BASIC_AUTH_PASS) so nothing secret is committed.
// ponytail: single shared credential; switch to Netlify Identity if per-user access is ever needed.
export default async (request, context) => {
  const user = Netlify.env.get("BASIC_AUTH_USER");
  const pass = Netlify.env.get("BASIC_AUTH_PASS");

  // No credentials configured: fail open so a misconfigured deploy isn't bricked.
  if (!user || !pass) return context.next();

  const header = request.headers.get("authorization") || "";
  const expected = "Basic " + btoa(`${user}:${pass}`);

  if (header !== expected) {
    return new Response("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Food Transparency UK", charset="UTF-8"' },
    });
  }

  return context.next();
};

export const config = { path: "/*" };
