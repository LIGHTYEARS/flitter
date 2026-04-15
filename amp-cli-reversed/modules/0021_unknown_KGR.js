async function KGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      pattern: t,
      organization: r,
      language: h,
      limit: i = 30,
      offset: c = 0
    } = a;
  if (c % i !== 0) return {
    ok: !1,
    message: `offset (${c}) must be divisible by limit (${i})`
  };
  let s = [],
    A = 0,
    l = i * 5,
    o = Math.floor(c / l) + 1,
    n = await R.fetchJSON(`user/repos?per_page=${l}&page=${o}&sort=updated&affiliation=owner,collaborator,organization_member`, {
      signal: e
    });
  if (n.ok && n.data) {
    let p = n.data;
    if (t) {
      let _ = t.toLowerCase();
      p = p.filter(m => m.full_name.toLowerCase().includes(_));
    }
    if (r) {
      let _ = r.toLowerCase();
      p = p.filter(m => {
        return m.full_name.split("/")[0]?.toLowerCase() === _;
      });
    }
    if (h) {
      let _ = h.toLowerCase();
      p = p.filter(m => m.language?.toLowerCase() === _);
    }
    p.sort((_, m) => m.stargazers_count - _.stargazers_count), s.push(...p), A = p.length;
  }
  if (s.length < i) {
    let p = [];
    if (t) p.push(`${t} in:name`);
    if (r) p.push(`org:${r}`);
    if (h) p.push(`language:${h}`);
    let _ = p.length > 0 ? p.join(" ") : "*",
      m = i - s.length,
      b = await R.fetchJSON(`search/repositories?q=${encodeURIComponent(_)}&per_page=${Math.min(m, 100)}&sort=stars&order=desc`, {
        signal: e
      });
    if (b.ok && b.data) {
      let y = new Set(s.map(P => P.full_name)),
        u = b.data.items.filter(P => !y.has(P.full_name));
      s.push(...u.slice(0, m)), A += u.length;
    }
  }
  return {
    ok: !0,
    result: {
      repositories: s.slice(0, i).map(p => ({
        name: p.full_name,
        description: p.description,
        language: p.language,
        stargazersCount: p.stargazers_count,
        forksCount: p.forks_count,
        private: p.private
      })),
      totalCount: A
    }
  };
}