// Cloudflare Pages Function unter /api/auth
// Leitet zu GitHub weiter, um die Anmeldung für Decap CMS zu starten.

export async function onRequest({ env }) {
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(
      "GITHUB_CLIENT_ID ist nicht gesetzt (Cloudflare Pages → Settings → Environment variables).",
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", "repo,user");
  authorizeUrl.searchParams.set("state", state);

  return Response.redirect(authorizeUrl.toString(), 302);
}
