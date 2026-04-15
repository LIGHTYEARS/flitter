async function qGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    {
      limit: t = 100
    } = a,
    r = Kx(a.repository),
    h = (a.path ?? "").replace(/^\//, "");
  if (h === "." || h === "") h = "";
  let i = h.split("/").map(encodeURIComponent).join("/"),
    c = `repos/${r}/contents/${i}`,
    s = await R.fetchJSON(c, {
      signal: e
    });
  if (!s.ok || !s.data) return {
    ok: !1,
    message: `Failed to list directory: ${s.status} ${s.statusText ?? "Unknown error"}`
  };
  return {
    ok: !0,
    result: VzT(s.data).slice(0, t)
  };
}