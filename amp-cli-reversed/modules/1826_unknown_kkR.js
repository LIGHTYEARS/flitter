function kkR({
  filesystem: T,
  configService: R
}, a) {
  return v3(eET(T), a ? a : AR.of(null), R.workspaceRoot).pipe(L9(([e, t, r]) => {
    let h = r ? [r] : t?.env?.initial?.trees?.map(s => s.uri).filter(s => s !== void 0).map(s => I8(s)) ?? [],
      i = [];
    i.push(...h);
    for (let s of h) {
      let A = MR.dirname(s);
      while (A) {
        if (Q9T(A)) break;
        i.push(A);
        let l = MR.dirname(A);
        if (MR.equalURIs(l, A)) break;
        A = l;
      }
    }
    if (R.userConfigDir) i.push(MR.joinPath(R.userConfigDir, "amp")), i.push(R.userConfigDir);
    let c = i.flatMap(s => SP.map(A => MR.joinPath(s, A)));
    return okR(e, c).pipe(JR(s => {
      let A = [],
        l = new Set();
      for (let o of s) {
        let n = MR.dirname(o).toString(),
          p = MR.basename(o);
        if (l.has(n)) continue;
        let _ = SP.findIndex(y => y === p);
        if (_ === -1) continue;
        let m = !1,
          b = MR.dirname(o);
        for (let y = 0; y < _; y++) {
          let u = SP[y];
          if (s.some(P => {
            let k = MR.equalURIs(MR.dirname(P), b),
              x = MR.basename(P) === u;
            return k && x;
          })) {
            m = !0;
            break;
          }
        }
        if (m) continue;
        if (l.add(n), h.some(y => MR.hasPrefix(o, y))) {
          A.push({
            uri: d0(o),
            type: "project"
          });
          continue;
        }
        if (R.userConfigDir && MR.hasPrefix(o, R.userConfigDir)) {
          A.push({
            uri: d0(o),
            type: "user"
          });
          continue;
        }
        A.push({
          uri: d0(o),
          type: "parent"
        });
      }
      return A;
    }));
  }));
}