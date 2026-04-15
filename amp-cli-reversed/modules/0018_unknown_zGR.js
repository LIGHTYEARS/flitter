async function zGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      filePattern: t,
      limit: r = 100,
      offset: h = 0
    } = a,
    i = `repos/${Kx(a.repository)}/git/trees/HEAD?recursive=1`,
    c = await R.fetchJSON(i, {
      signal: e
    });
  if (!c.ok || !c.data) return {
    ok: !1,
    message: `Failed to fetch file tree: ${c.status} ${c.statusText ?? "Unknown error"}`
  };
  if (c.data.truncated) return {
    ok: !1,
    message: "Repository tree is too large for recursive listing. Try a more specific search or use search_github instead."
  };
  return {
    ok: !0,
    result: c.data.tree.filter(s => s.type === "blob").map(s => s.path).filter(s => BGR(t, s)).slice(h, h + r)
  };
}