async function wp0(T, R, a, e) {
  let t = await pVT(R, a),
    r = e.payload ?? etT(T),
    h = e.workerURL ?? Pi(e.ampURL),
    i = await fetch(`${h}/threads/${T.id}/import`, {
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
  if (!i.ok) throw Error(`Failed to import thread into DTW: ${i.status} ${await i.text()}`);
  if ((await i.json()).ok !== !0) throw Error("Failed to import thread into DTW: import endpoint returned an invalid response");
  return "imported";
}