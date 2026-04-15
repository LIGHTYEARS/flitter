async function ukR({
  filesystem: T
}, R, a, e = [], t) {
  let r = [],
    h = new Ls(),
    i = new Ls(),
    c = new xh(),
    s = [];
  async function A(_, m = !1) {
    let b = I8(_.uri);
    if (h.has(b)) return null;
    if (i.has(b)) return null;
    i.add(b);
    try {
      let y = await T.readFile(b, {
          signal: t
        }),
        {
          frontMatter: u,
          content: P
        } = XDT(y),
        k = lkR(u, e, b),
        x = {
          ..._,
          type: m ? _.type : "mentioned",
          content: P,
          frontMatter: u,
          exclude: !k,
          "~debug": {
            mentionedBy: c.has(b) ? [c.get(b)] : void 0
          }
        };
      h.add(b), r.push(x);
      let f = await AkR(T, b, y, a, t);
      for (let v of f) {
        if (!c.has(v)) c.set(v, _.uri);
        let g = {
            uri: d0(v),
            type: "mentioned"
          },
          I = await A(g, !1);
        if (I) s.push({
          file: I,
          afterFile: _.uri
        });
      }
      return x;
    } catch (y) {
      if (y instanceof Error && y.message.includes("EISDIR")) return J.debug("Guidance file is a directory, skipping", {
        uri: _.uri
      }), null;
      if (Er(y)) J.debug("Guidance file not found (expected)", {
        uri: _.uri
      });else J.error("Error resolving guidance file", {
        uri: _.uri,
        error: y
      });
      return null;
    } finally {
      i.delete(b);
    }
  }
  for (let _ of R7T(R)) await A(_, !0);
  let l = [],
    o = new Set();
  function n(_) {
    if (o.has(_.uri)) return;
    l.push(_), o.add(_.uri);
    let m = s.filter(b => b.afterFile === _.uri);
    for (let b of m) n(b.file);
  }
  let p = r.filter(_ => _.type !== "mentioned");
  for (let _ of p) n(_);
  return l;
}