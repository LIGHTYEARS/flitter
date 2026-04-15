function Q9R(T, R, a) {
  let e = $R.of(a).colors,
    t = new cT({
      italic: !0
    }),
    r = [],
    h = "cwd" in T && typeof T.cwd === "string" ? T.cwd : "workdir" in T && typeof T.workdir === "string" ? T.workdir : void 0;
  if (h) {
    let i = rf(a),
      c = zR.file(h),
      s = Mr(c, i ?? void 0);
    if (s.length > 0) r.push(new G(" (", t)), r.push(new G("in: ", t.copyWith({
      dim: !0
    }))), r.push(new G(s, t.copyWith({
      dim: !0
    })));
  }
  if (R.status === "done" && typeof R.result.exitCode === "number" && R.result.exitCode !== 0) {
    if (r.length > 0) r.push(new G(", ", t));else r.push(new G(" (", t));
    r.push(new G("exit code: ", t)), r.push(new G(String(R.result.exitCode), t.copyWith({
      color: e.destructive
    })));
  }
  if (r.length > 0) r.push(new G(")", t));
  return r;
}