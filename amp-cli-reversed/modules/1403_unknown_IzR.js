function IzR(T, R) {
  if (!T) return {
    kind: "command",
    isWriteLike: !1
  };
  if (PzR.test(T)) return {
    kind: "command",
    isWriteLike: !0
  };
  let a = [];
  try {
    a = W5T(HO(T, R));
  } catch {
    return {
      kind: "command",
      isWriteLike: !1
    };
  }
  if (a.length !== 1) {
    let h = SzR(a, T);
    if (h) return h;
    let i = jzR(a);
    if (i) return i;
    let c = izR(a);
    if (c) return {
      kind: "read",
      ...c,
      isWriteLike: !1
    };
    return {
      kind: "command",
      isWriteLike: !1
    };
  }
  let e = a[0];
  if (!e) return {
    kind: "command",
    isWriteLike: !1
  };
  let t = vA(e.program);
  if (!t) return {
    kind: "command",
    isWriteLike: !1
  };
  let r = qb(e);
  if (!r) return {
    kind: "command",
    program: t,
    isWriteLike: !1
  };
  if (yzT(t, r)) return {
    kind: "command",
    program: t,
    path: $zR(t, r),
    isWriteLike: !0
  };
  if (t === "git" && r[0] === "grep") {
    let h = cw(r.slice(1));
    if (!h) return {
      kind: "command",
      program: "git grep",
      isWriteLike: !1
    };
    return {
      kind: "search",
      program: "git grep",
      query: h,
      path: sw(r.slice(1)),
      isWriteLike: !1
    };
  }
  if (t === "rg" && r.includes("--files")) return {
    kind: "list",
    program: t,
    path: nM(r),
    isWriteLike: !1
  };
  if (t === "git" && r[0] === "ls-files") return {
    kind: "list",
    program: "git ls-files",
    path: nM(r.slice(1)),
    isWriteLike: !1
  };
  if (mzT.has(t)) {
    let h = cw(r);
    if (!h) return {
      kind: "command",
      program: t,
      isWriteLike: !1
    };
    return {
      kind: "search",
      program: t,
      query: h,
      path: sw(r),
      isWriteLike: !1
    };
  }
  if (daT.has(t)) {
    let h = hzR(t, r);
    if (!h) return {
      kind: "command",
      program: t,
      isWriteLike: !1
    };
    return {
      kind: "read",
      program: t,
      ...h,
      isWriteLike: !1
    };
  }
  if (uzR.has(t)) {
    let h = t === "find" ? vzR(r) : nM(r);
    if (!h) return {
      kind: "command",
      program: t,
      isWriteLike: !1
    };
    return {
      kind: "list",
      program: t,
      path: h,
      isWriteLike: !1
    };
  }
  return {
    kind: "command",
    program: t,
    isWriteLike: !1
  };
}