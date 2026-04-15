function T$T(T) {
  return "interrupt" in T && T.interrupt === !0;
}
function R$T(T) {
  return T.resolvedTokenUsage;
}
function Iz0(T, R) {
  let a;
  for (let [e, t] of Object.entries(T)) {
    let r;
    for (let [h, i] of t.tools.entries()) {
      let c = R.get(i.toolUse.id);
      if (c === i.toolProgress) continue;
      r ??= [...t.tools];
      let {
        toolProgress: s,
        ...A
      } = i;
      r[h] = c === void 0 ? A : {
        ...A,
        toolProgress: c
      };
    }
    if (!r) continue;
    a ??= {
      ...T
    }, a[e] = {
      ...t,
      tools: r
    };
  }
  return a ?? T;
}