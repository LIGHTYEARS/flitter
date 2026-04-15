function ay(T, R) {
  if (!T) return;
  for (let a of Object.keys(T).sort((e, t) => t.length - e.length)) if (gGT(a).test(R)) return [...T[a]];
  return;
}
function Pi0(T, R, a) {
  let e = R,
    t = R ? R.next : T.head,
    r = new LeT(a, e, t, T);
  return r.next === void 0 && (T.tail = r), r.prev === void 0 && (T.head = r), T.length++, r;
}
function ki0(T, R) {
  T.tail = new LeT(R, T.tail, void 0, T), T.head || (T.head = T.tail), T.length++;
}
function xi0(T, R) {
  T.head = new LeT(R, void 0, T.head, T), T.tail || (T.tail = T.head), T.length++;
}
function nH(T) {
  return xr0(T);
}
function Pi(T) {
  if (T.includes("staging.ampcodedev.org")) return ic0;
  return hc0;
}
function lH(T) {
  if (T.includes("staging.ampcodedev.org")) return sc0;
  return cc0;
}
async function RKT(T) {
  let R = T.workerURL ?? Pi(T.ampURL),
    a = await T.configService.getLatest(T.signal),
    e = await a.secrets.getToken("apiKey", a.settings.url);
  if (!e) throw Error("API key required. Please run `amp login` first.");
  let t = await fetch(`${R}/threads/${T.threadID}/context-analysis`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${e}`
    },
    signal: T.signal
  });
  if (!t.ok) {
    let h = await t.text();
    throw Error(`Context analysis request failed (${t.status}): ${h}`);
  }
  let r = await t.json();
  if (!r.ok || !r.analysis) throw Error(r.error ?? "Invalid context analysis response from DTW");
  return r.analysis;
}