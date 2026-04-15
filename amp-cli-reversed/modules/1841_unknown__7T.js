async function _7T(T, R, a) {
  try {
    let e = MR.joinPath(R, FkR),
      t = await T.readFile(e, {
        signal: a
      }),
      r = HkR(t);
    if (Object.keys(r).length > 0) return J.debug("Loaded MCP servers from skill", {
      skillDir: d0(R),
      serverCount: Object.keys(r).length,
      serverNames: Object.keys(r)
    }), r;
  } catch {}
  return;
}