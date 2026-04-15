function MgT(T, R, a) {
  let e = DgT(T, R, a);
  if (!e) return null;
  let t = [e.id],
    r = e.remaining.trim();
  while (r.startsWith("&")) {
    r = r.slice(1).trim();
    let h = DgT(r, R, a);
    if (!h) break;
    t.push(h.id), r = h.remaining.trim();
  }
  return {
    ids: t,
    remaining: r
  };
}