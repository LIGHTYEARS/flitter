async function vA0(T, R) {
  let a = await fetch(`${T}/api/internal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${R}`
    },
    body: JSON.stringify({
      method: "getGitHubGitAccessToken",
      params: {
        host: "github.com",
        protocol: "https"
      }
    })
  });
  if (!a.ok) return J.error("Failed to fetch GitHub git token", {
    status: a.status
  }), process.stderr.write(`Unable to fetch GitHub credentials.
`), null;
  let e = await a.json();
  if (!e.ok || !e.result?.accessToken) {
    if (J.debug("GitHub git token not available", {
      error: e.error
    }), e.error?.message) process.stderr.write(`${e.error.message}
`);
    return null;
  }
  return e.result.accessToken;
}