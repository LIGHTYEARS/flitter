function Hx0(T, R) {
  let a = [],
    e = new Set(),
    t = h => {
      let i = `${h.kind}:${h.title}`;
      if (e.has(i)) return;
      e.add(i), a.push(h);
    };
  for (let h of FtT(T)) {
    let i = Ex0(h) ?? Vw(h);
    if (i) t(i);
  }
  if (a.length === 0) for (let h of Cx0(T)) t({
    kind: "thinking",
    title: h
  });
  if (T.status === "done") t({
    kind: "explore",
    title: "Code tour complete"
  });else if (T.status === "error") {
    let h = aa(T);
    t({
      kind: "explore",
      title: h ? `Code tour failed: ${h}` : "Code tour failed"
    });
  }
  if (a.length === 0) t({
    kind: "thinking",
    title: T.status === "queued" ? "Code tour queued" : "Generating code tour..."
  });
  let r = typeof R.focus === "string" ? R.focus.trim() : void 0;
  return {
    actions: a,
    summary: r ? `code tour: ${r}` : "code tour"
  };
}