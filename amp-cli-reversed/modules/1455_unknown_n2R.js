function n2R(T, R) {
  return T.map(a => {
    let e = a.diff ? RS(a.diff) : [],
      t = R.filter(r => MzT(r, a, e));
    if (t.length === 0) return a;
    return {
      ...a,
      diff: t.map(r => r.diff).join(`
`)
    };
  });
}