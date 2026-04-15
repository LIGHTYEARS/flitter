function xiT(T, R) {
  let a = T.startsWith("/"),
    e = /^[a-zA-Z]:[\\/]/.test(T);
  if (!a && !e) return T;
  let t = T.replace(/\\/g, "/");
  if (R && R.length > 0) for (let i of R) {
    if (!i.uri) continue;
    let c = i.uri.match(/^file:\/\/(.+)$/);
    if (!c?.[1]) continue;
    let s = decodeURIComponent(c[1]).replace(/\\/g, "/"),
      A = s.startsWith("/") && /^\/[a-zA-Z]:/.test(s) ? s.slice(1) : s;
    if (t.startsWith(A)) {
      let l = t.slice(A.length);
      return l.startsWith("/") ? l.slice(1) : l;
    }
  }
  let r = t.match(/\/(?:Users|home)\/[^/]+\/[^/]+\/(.+)/);
  if (r?.[1]) return r[1];
  let h = t.match(/^[a-zA-Z]:\/Users\/[^/]+\/[^/]+\/(.+)/);
  if (h?.[1]) return h[1];
  return null;
}