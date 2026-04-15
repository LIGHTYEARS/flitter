async function $7T(T, R = () => !0) {
  let a = await T.getAllRecords(),
    e = I7T(a, (r, h) => !r.reverted && R(h)),
    t = [];
  for (let [r, h] of e.entries()) {
    let {
      added: i,
      removed: c,
      modified: s,
      created: A,
      reverted: l
    } = KkR(h);
    if (!i && !c && !s) continue;
    t.push({
      created: A,
      uri: d0(r),
      reverted: l,
      diff: void 0,
      after: void 0,
      diffStat: {
        added: i,
        removed: c,
        modified: s
      }
    });
  }
  return t;
}