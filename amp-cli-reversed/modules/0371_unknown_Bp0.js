async function Bp0(T, R, a, e) {
  let t = await pVT(R, a),
    r = e.payload ?? etT(T),
    h = lH(e.ampURL),
    i = await nH({
      endpoint: h
    }).threadActor.getOrCreate([T.id], {
      createWithInput: {
        threadId: T.id,
        ownerUserId: e.ownerUserId,
        threadVersion: e.threadVersion,
        ...(e.agentMode ? {
          agentMode: e.agentMode
        } : {})
      }
    }).fetch("/import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        thread: r
      })
    });
  if (i.status === 409) return "already-imported";
  if (!i.ok) throw Error(`Failed to import thread into thread actors: ${i.status} ${await i.text()}`);
  if ((await i.json()).ok !== !0) throw Error("Failed to import thread into thread actors: import endpoint returned an invalid response");
  return "imported";
}