async function y7T(T, R, a) {
  let e = [],
    t = 5;
  async function r(h, i) {
    if (i > 5) return;
    try {
      let c = await T.readdir(h, {
        signal: a
      });
      for (let s of c) {
        let A = MR.basename(s.uri),
          l = await m7T(T, s, a);
        if (l && (A === "node_modules" || A === ".git")) continue;
        if (l) await r(s.uri, i + 1);else if (f7T.test(A)) e.push(s.uri);
      }
    } catch (c) {
      J.debug("Failed to scan skill directory", {
        path: h.toString(),
        error: c
      });
    }
  }
  return await r(R, 0), e;
}