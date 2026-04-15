async function SA0(T, R, a) {
  let e = await fetch(`${T}/api/internal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${R}`
    },
    body: JSON.stringify({
      method: "signCommit",
      params: {
        commitObject: a
      }
    })
  });
  if (!e.ok) return J.error("Failed to fetch commit signature", {
    status: e.status
  }), null;
  let t = await e.json();
  if (!t.ok || !t.result?.signature) return J.error("Commit signing failed", {
    error: t.error
  }), null;
  return t.result.signature;
}