async function HGR(T) {
  let {
      fetcher: R,
      args: a,
      signal: e
    } = T,
    t = Kx(a.repository),
    r = a.path.replace(/^\//, ""),
    h = r || "/",
    i = r.split("/").map(encodeURIComponent).join("/"),
    c = await R.fetchJSON(`repos/${t}/contents/${i}`, {
      signal: e
    });
  if (!c.ok || !c.data) return {
    ok: !1,
    message: `Failed to read file: ${c.status} ${c.statusText ?? "Unknown error"}`
  };
  if (!NGR(c.data)) {
    if (Array.isArray(c.data)) {
      let m = VzT(c.data),
        b = NLT(m, a.read_range, m.length),
        y = new TextEncoder().encode(b).length;
      if (y > 131072) return {
        ok: !1,
        message: `Directory listing is too large (${Math.round(y / 1024)}KB). The directory has ${m.length} entries. Use read_range to inspect a smaller slice or list_directory_github with a limit.`
      };
      return {
        ok: !0,
        result: {
          absolutePath: h,
          content: b,
          isDirectory: !0,
          directoryEntries: m
        }
      };
    }
    let _ = UGR(c.data);
    return {
      ok: !1,
      message: `Cannot read "${h}" because GitHub returned ${_} metadata instead of file contents.`
    };
  }
  let s;
  if (c.data.encoding === "base64") s = wGR(c.data.content.replace(/\n/g, ""));else s = c.data.content;
  let A = s;
  if (a.read_range && a.read_range.length === 2) {
    let [_, m] = a.read_range;
    A = s.split(`
`).slice(Math.max(0, _ - 1), m).join(`
`);
  }
  let l = new TextEncoder().encode(A).length;
  if (l > 131072) return {
    ok: !1,
    message: `File is too large (${Math.round(l / 1024)}KB). The file has ${s.split(`
`).length} lines. Please retry with a smaller read_range parameter.`
  };
  let o = A.split(`
`),
    n = a.read_range?.[0] ?? 1,
    p = o.map((_, m) => `${n + m}: ${_}`);
  return {
    ok: !0,
    result: {
      absolutePath: r,
      content: p.join(`
`)
    }
  };
}