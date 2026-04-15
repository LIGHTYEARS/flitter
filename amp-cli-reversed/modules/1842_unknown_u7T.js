async function b7T(T, R) {
  if (R.scheme === "file") try {
    let a = await T.realpath(R);
    return d0(a);
  } catch {}
  return d0(R);
}
async function m7T(T, R, a) {
  if (R.isDirectory) return !0;
  try {
    return (await T.stat(R.uri, {
      signal: a
    })).isDirectory;
  } catch {
    return !1;
  }
}
async function u7T(T, R, a) {
  let e = [],
    t = 5,
    r = new Set(["skill.md", "mcp.json"]),
    h = new Set(["node_modules", ".git", "__pycache__"]);
  async function i(c, s) {
    if (s > 5) return;
    try {
      let A = await T.readdir(c, {
        signal: a
      });
      for (let l of A) {
        let o = MR.basename(l.uri);
        if (await m7T(T, l, a)) {
          if (!h.has(o)) await i(l.uri, s + 1);
        } else if (!r.has(o.toLowerCase())) e.push(l.uri.fsPath);
      }
    } catch {}
  }
  return await i(R, 0), e.sort();
}