// Einziger Worker-Einstiegspunkt für dieses Projekt (neues Cloudflare-Modell
// "Workers mit statischen Assets", ersetzt die frühere Pages-Functions-
// Ordnerstruktur). /api/* wird hier behandelt, alles andere geht an die
// statischen Dateien aus _site (siehe wrangler.jsonc → assets.directory).

async function handleAuth(request, env) {
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(
      "GITHUB_CLIENT_ID ist nicht gesetzt (Cloudflare → Settings → Variables).",
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

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Fehlender 'code'-Parameter im Callback.", { status: 400 });
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    return new Response(
      `GitHub-OAuth-Fehler: ${tokenData.error_description || tokenData.error}`,
      { status: 400 }
    );
  }

  const payload = JSON.stringify({
    token: tokenData.access_token,
    provider: "github",
  });

  const html = `<!DOCTYPE html>
<html>
<body>
<script>
(function() {
  function receiveMessage() {
    window.opener.postMessage(
      'authorization:github:success:${payload.replace(/'/g, "\\'")}',
      '*'
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth") {
      return handleAuth(request, env);
    }
    if (url.pathname === "/api/auth/callback") {
      return handleCallback(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
