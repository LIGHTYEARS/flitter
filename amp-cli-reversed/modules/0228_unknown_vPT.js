function PGT(T, R, a) {
  let e = [];
  if (e.push(b90), e.push(`${m90}${R}`), a) e.push(`${u90}${encodeURIComponent(JSON.stringify(a))}`);
  return e;
}
async function vPT(T, R, a) {
  let e = new URL(a.url),
    t = qk(T),
    r = geT(t, R, T.token, `${e.pathname}${e.search}`),
    h = null,
    i = ir0(T, a, R);
  if (a.method !== "GET" && a.method !== "HEAD") {
    if (a.bodyUsed) throw Error("Request body has already been consumed");
    let s = await a.arrayBuffer();
    if (s.byteLength !== 0) h = s, i.delete("transfer-encoding"), i.set("content-length", String(h.byteLength));
  }
  let c = new Request(r, {
    method: a.method,
    headers: i,
    body: h,
    signal: a.signal
  });
  return hr0(await fetch(c));
}