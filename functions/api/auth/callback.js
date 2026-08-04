// Cloudflare Pages Function unter /api/auth/callback
// Tauscht den GitHub-Code gegen ein Access-Token und übergibt es per
// postMessage an das Decap-CMS-Fenster, genau wie es der Decap-Standard
// für einen selbstgehosteten GitHub-OAuth-Handler erwartet.

export async function onRequest({ request, env }) {
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

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
