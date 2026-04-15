async function FGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      query: t,
      author: r,
      since: h,
      until: i,
      path: c,
      limit: s = 50,
      offset: A = 0
    } = a;
  if (A % s !== 0) return {
    ok: !1,
    message: `offset (${A}) must be divisible by limit (${s})`
  };
  let l = Kx(a.repository),
    o = Math.min(s, 100),
    n = Math.floor(A / o) + 1,
    p = !1,
    _;
  if (c || !t) {
    let u = new URLSearchParams({
      per_page: String(o),
      page: String(n)
    });
    if (h) u.append("since", h);
    if (i) u.append("until", i);
    if (r) u.append("author", r);
    if (c) u.append("path", c);
    _ = `repos/${l}/commits?${u.toString()}`;
  } else {
    p = !0;
    let u = [t, `repo:${l}`];
    if (r) u.push(`author:${r}`);
    if (h) u.push(`author-date:>=${h}`);
    if (i) u.push(`author-date:<=${i}`);
    let P = u.join(" ");
    _ = `search/commits?q=${encodeURIComponent(P)}&per_page=${o}&page=${n}&sort=author-date&order=desc`;
  }
  let m = await R.fetchJSON(_, {
    signal: e
  });
  if (!m.ok || !m.data) return {
    ok: !1,
    message: `Failed to search commits: ${m.status} ${m.statusText ?? "Unknown error"}`
  };
  let b, y;
  if (p) {
    let u = m.data;
    b = u.items ?? [], y = u.total_count ?? 0;
  } else {
    if (b = m.data, t) {
      let u = t.toLowerCase();
      b = b.filter(P => P.commit.message.toLowerCase().includes(u) || P.commit.author.name.toLowerCase().includes(u) || P.commit.author.email.toLowerCase().includes(u));
    }
    y = b.length;
  }
  return {
    ok: !0,
    result: {
      commits: b.map(u => {
        let P = u.commit.message.trim();
        return {
          sha: u.sha,
          message: P.length > 1024 ? `${P.slice(0, 1024)}... (truncated)` : P,
          author: {
            name: u.commit.author.name,
            email: u.commit.author.email,
            date: u.commit.author.date
          }
        };
      }),
      totalCount: y
    }
  };
}