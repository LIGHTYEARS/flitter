function xkR({
  filesystem: T,
  configService: R
}, a) {
  function e(t) {
    let r = new Set(),
      h = [];
    for (let i of t) {
      let c = MR.dirname(i).toString();
      if (!r.has(c)) r.add(c), h.push(c);
    }
    return h.join(",");
  }
  return v3(a.pipe(JR(t => ({
    thread: t,
    readFiles: T7T(t)
  })), E9((t, r) => e(t.readFiles) === e(r.readFiles))), eET(T), R.workspaceRoot).pipe(I2(async ([{
    readFiles: t
  }, r, h], i) => {
    let c = h ? [h] : [],
      s = new Ls();
    for (let A of t) {
      let l = MR.dirname(A);
      while (!s.has(l) && c.some(o => MR.hasPrefix(l, o) && !MR.equalURIs(o, l))) s.add(l), l = MR.dirname(l);
    }
    return (await Promise.all(Array.from(s.keys()).map(async A => {
      for (let l of SP) try {
        let o = MR.joinPath(A, l);
        return await r.stat(o, {
          signal: i
        }), {
          uri: d0(o),
          type: "subtree"
        };
      } catch (o) {
        if (typeof o === "object" && o !== null && "code" in o && o.code === "ELOOP") J.warn("Infinite symlink loop detected in guidance file", {
          file: MR.joinPath(A, l).toString()
        });
      }
      return null;
    }))).filter(A => A !== null);
  }));
}