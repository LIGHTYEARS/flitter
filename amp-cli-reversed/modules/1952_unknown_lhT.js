function lhT(T, R) {
  let a = $R.of(T).colors,
    e = R.toolRun.status === "done" ? R.toolRun.result.output : "progress" in R.toolRun ? R.toolRun.progress?.output : void 0,
    t = R.toolRun.status === "done" ? R.toolRun.result.exitCode : void 0,
    r = R.toolRun.status === "cancelled" ? "Cancelled" : R.toolRun.status === "error" ? "Errored" : void 0,
    h = new cT({
      color: a.foreground,
      dim: !0,
      italic: !0
    }),
    i = [],
    c = s => {
      let A = i.length === 0 ? "" : `

`;
      i.push(new G(`${A}${s}`, h));
    };
  if (e && e.trim()) i.push(new G(e.trimEnd(), new cT({
    color: a.foreground,
    dim: !0
  })));
  if (t !== void 0 && t !== 0) c(`exit code: ${t}`);
  if (r) c(`(${r}, command and output not shown to agent)`);else if (R.hidden) c("(Command and output not shown to agent)");
  if (i.length === 0) return null;
  return new xT({
    text: new G("", void 0, i),
    selectable: !0
  });
}