async function sk0(T, R, a) {
  let e = (await T.getLatest()).settings.url,
    t = {};
  if (a) t.threadId = a;
  let r = await fetch(`${e}/api/durable-thread-workers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${R}`
    },
    body: JSON.stringify(t)
  });
  if (!r.ok) throw Error(`Failed to fetch thread credentials: ${r.status} ${await r.text()}`);
  let h = await r.json();
  if (!h.threadId || !h.wsToken) throw Error("Thread credentials response missing threadId or wsToken");
  return {
    threadId: h.threadId,
    wsToken: h.wsToken
  };
}