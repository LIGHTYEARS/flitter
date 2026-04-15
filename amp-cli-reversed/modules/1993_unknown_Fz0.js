function s$T(T) {
  if (!T || T.length === 0) return;
  let R = T.join(" ").trim();
  return R.length > 0 ? R : void 0;
}
async function Fz0(T) {
  let R = {
      ...(T.agentMode ? {
        agentMode: T.agentMode
      } : {}),
      ...(T.repositoryURL ? {
        repositoryURL: T.repositoryURL
      } : {})
    },
    a = await fetch(`${T.ampURL}/api/durable-thread-workers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${T.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(R)
    });
  if (!a.ok) {
    let t = await a.text();
    throw new GR(`Create request failed (${a.status}): ${t}`, 1);
  }
  let e = await a.json();
  if (!e.threadId || !Vt(e.threadId)) throw new GR("Create response did not include a valid thread ID", 1);
  return e.threadId;
}