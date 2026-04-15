async function AF0(T) {
  let {
      dependencies: R,
      visibility: a
    } = T,
    e = (await Hs()).trees?.[0]?.repository?.url,
    t = await fi("/api/durable-thread-workers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...(e ? {
          repositoryURL: e
        } : {}),
        ...(T.usesThreadActors ? {
          usesThreadActors: !0
        } : {})
      })
    }, R.configService);
  if (!t.ok) {
    let i = await t.text().catch(() => "");
    throw new GR(`Failed to create DTW thread: ${t.status}${i ? ` ${i}` : ""}`, 1);
  }
  let r = await t.json();
  if (!r.threadId || !Vt(r.threadId)) throw new GR("DTW thread creation response missing valid threadId", 1);
  if (!r.ownerUserId || typeof r.threadVersion !== "number") throw new GR("DTW thread creation response missing ownerUserId or threadVersion", 1);
  let h = r.threadId;
  if (await OS(h, "interactive"), a) await R.threadService.updateThreadMeta(h, MA(a));
  return {
    threadId: h,
    ownerUserId: r.ownerUserId,
    threadVersion: r.threadVersion,
    ...(r.agentMode ? {
      agentMode: r.agentMode
    } : {})
  };
}