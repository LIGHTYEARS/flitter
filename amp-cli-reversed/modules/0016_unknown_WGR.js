async function WGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      pattern: t,
      path: r,
      limit: h = 30,
      offset: i = 0
    } = a;
  if (i % h !== 0) return {
    ok: !1,
    message: `offset (${i}) must be divisible by limit (${h})`
  };
  let c = Kx(a.repository),
    s = Math.min(h, 100),
    A = Math.floor(i / s) + 1,
    l = `${t} repo:${c}`;
  if (r && r !== ".") l += ` path:${r}`;
  let o = `search/code?q=${encodeURIComponent(l)}&per_page=${s}&page=${A}`,
    n = await R.fetchJSON(o, {
      headers: {
        Accept: "application/vnd.github.v3.text-match+json"
      },
      signal: e
    });
  if (!n.ok || !n.data) return {
    ok: !1,
    message: `Failed to search code: ${n.status} ${n.statusText ?? "Unknown error"}`
  };
  let p = n.data;
  if (p.total_count === 0) return {
    ok: !0,
    result: {
      results: [],
      totalCount: 0
    }
  };
  let _ = new Map();
  for (let m of p.items) {
    if (!_.has(m.path)) _.set(m.path, []);
    let b = _.get(m.path);
    for (let y of m.text_matches) if (y.property === "content" && y.fragment) {
      let u = y.fragment.trim();
      if (u.length > 2048) u = `${u.slice(0, 2048)}... (truncated)`;
      b.push(u);
    }
  }
  return {
    ok: !0,
    result: {
      results: Array.from(_.entries()).map(([m, b]) => ({
        file: m,
        chunks: b
      })),
      totalCount: p.total_count
    }
  };
}