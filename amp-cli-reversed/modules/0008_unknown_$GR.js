async function $GR(T, R, a, e, t, r, h) {
  let i = await r.configService.getLatest(h),
    c = [`limit=${e}`, `start=${t}`];
  if (a) c.push(`name=${encodeURIComponent(a)}`);
  let s = c.join("&"),
    A;
  if (R) A = `/rest/api/1.0/projects/${encodeURIComponent(R)}/repos?${s}`;else A = `/rest/api/1.0/repos?${s}`;
  let l = await cn(T, A, {
    signal: h
  }, i);
  if (!l.ok || !l.data) throw Error(`Failed to fetch repositories: ${l.status} ${l.statusText || "Unknown error"}`);
  return {
    repositories: l.data.values,
    totalCount: l.data.size
  };
}