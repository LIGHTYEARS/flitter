async function yGR(T, R, a, e, t, r, h, i, c) {
  let s = [],
    A = mGR.default(t),
    l = 0,
    o = 1000,
    n = 0,
    p = !1,
    _ = uGR(t);
  while (!0) {
    if (i?.aborted) break;
    let m = [`limit=${o}`, `start=${l}`];
    if (e) m.push(`at=${encodeURIComponent(e)}`);
    if (_) m.push(`path=${LaT(_)}`);
    let b = m.join("&"),
      y = `/rest/api/1.0/projects/${R}/repos/${a}/files?${b}`,
      u = await cn(T, y, {
        signal: i
      }, h);
    if (!u.ok || !u.data) throw Error(`Failed to fetch files: ${u.status} ${u.statusText || "Unknown error"}`);
    let P = [],
      k = !0,
      x = l + o;
    if (Array.isArray(u.data)) P = u.data;else {
      let f = u.data;
      if (f.values) {
        for (let v of f.values) if (v.type === "FILE") P.push(v.path.toString);
      }
      k = f.isLastPage !== !1, x = f.nextPageStart ?? l + o;
    }
    n += P.length;
    for (let f of P) if (A(f)) s.push(f);
    if (c?.(n, s.length), s.length >= r) {
      p = !k;
      break;
    }
    if (n >= KzT) {
      p = !k;
      break;
    }
    if (k) break;
    l = x;
  }
  return {
    files: s,
    truncated: p,
    totalFetched: n
  };
}