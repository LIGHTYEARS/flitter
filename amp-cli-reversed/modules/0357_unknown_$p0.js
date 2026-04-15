async function $p0(T, R, a, e) {
  let t = await atT(T, "/threads", {
    ...(R ? {
      repositoryURL: R
    } : {}),
    ...(a ? {
      agentMode: a
    } : {}),
    relationship: e
  });
  if (!t.ok) throw Error(`Failed to create handoff thread: ${t.status} ${await t.text()}`);
  let r = await t.json();
  if (!r.threadId) throw Error("Thread creation response missing threadId");
  return r.threadId;
}