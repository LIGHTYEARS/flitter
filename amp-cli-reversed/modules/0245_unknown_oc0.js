async function oc0(T) {
  let R = lH(T.ampURL),
    a = nH({
      endpoint: R
    }),
    e = await T.configService.getLatest(T.signal),
    t = await e.secrets.getToken("apiKey", e.settings.url);
  if (!t) throw Error("API key required. Please run `amp login` first.");
  let r = await a.threadActor.get([T.threadID]).fetch("/context-analysis", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${t}`
    },
    signal: T.signal
  });
  if (!r.ok) {
    let i = await r.text();
    throw Error(`Context analysis request failed (${r.status}): ${i}`);
  }
  let h = await r.json();
  if (!h.ok || !h.analysis) throw Error(h.error ?? "Invalid context analysis response from DTW");
  return h.analysis;
}