async function uA(T, R, a, e = {}) {
  let t = {
      ...(T ? {
        threadId: T
      } : {}),
      ...(e.repositoryURL ? {
        repositoryURL: e.repositoryURL
      } : {}),
      ...(!T && e.executorType ? {
        executorType: e.executorType
      } : {}),
      ...(e.agentMode ? {
        agentMode: e.agentMode
      } : {}),
      ...(e.relationship ? {
        relationship: e.relationship
      } : {}),
      ...(e.usesThreadActors ? {
        usesThreadActors: !0
      } : {})
    },
    r = await fi("/api/durable-thread-workers", _VT({
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(t),
      signal: e.signal
    }, a), R);
  if (!r.ok) throw Error(`Failed to create DTW thread: ${r.status} ${await r.text()}`);
  let h = await r.json();
  if (!h.threadId || !h.wsToken) throw Error("DTW thread creation response missing threadId or wsToken");
  if (!h.ownerUserId || typeof h.threadVersion !== "number") throw Error("DTW thread creation response missing ownerUserId or threadVersion");
  return {
    threadId: h.threadId,
    wsToken: h.wsToken,
    usesDtw: h.usesDtw ?? !0,
    usesThreadActors: h.usesThreadActors ?? !1,
    executorType: h.executorType ?? null,
    ownerUserId: h.ownerUserId,
    threadVersion: h.threadVersion,
    ...(h.agentMode ? {
      agentMode: h.agentMode
    } : {})
  };
}