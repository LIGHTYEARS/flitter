async function Np0(T, R, a, e = {}) {
  let t = e.executorType ?? "local-client",
    r = await fi(`/api/durable-thread-workers/${T}`, _VT({
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        executorType: t,
        ...(e.usesThreadActors ? {
          usesThreadActors: !0
        } : {})
      })
    }, a), R);
  if (!r.ok) throw Error(`Failed to mark thread as imported: ${r.status} ${await r.text()}`);
  let h = await r.json();
  if (h.ok !== !0 || h.usesDtw !== !0 || h.executorType !== t || typeof h.usesThreadActors !== "boolean") throw Error("Failed to mark thread as imported: server returned an invalid response");
  if (e.usesThreadActors && h.usesThreadActors !== !0) throw Error("Failed to mark thread as actor-backed: server returned an invalid response");
}