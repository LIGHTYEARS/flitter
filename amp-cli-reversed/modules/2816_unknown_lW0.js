function nW0({
  actions: T,
  reads: R,
  searches: a,
  explores: e
}) {
  return {
    thought: T.filter(t => t.kind === "thinking").length,
    read: R,
    search: a,
    explore: e
  };
}
function lW0(T, R) {
  let a = nW0(T),
    e = new cT({
      color: R.app.toolName
    }),
    t = new cT({
      color: R.app.toolName
    }),
    r = [],
    h = a.search + a.explore,
    i = [{
      count: a.thought,
      suffix: o9(a.thought, "thought")
    }, {
      count: a.read,
      suffix: o9(a.read, "file read")
    }, {
      count: h,
      suffix: o9(h, "search", "searches")
    }, {
      count: T.guidanceFilesCount,
      suffix: o9(T.guidanceFilesCount, "guidance file")
    }];
  for (let c of i) {
    if (c.count <= 0) continue;
    if (r.length > 0) r.push(new G(", ", t));
    let s = new cT({
      color: R.app.toolName
    });
    r.push(new G(String(c.count), s)), r.push(new G(` ${c.suffix}`, e));
  }
  if (r.length === 0) return [new G("Exploring", e)];
  return r;
}