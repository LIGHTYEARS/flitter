function S2R(T, R, a) {
  return `Results truncated: showing ${T} of ${R} matches (${a} hidden).`;
}
function d2R(T) {
  return T.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function C2R(T, R, a) {
  let e = ["--with-filename", "--line-number", "--no-heading", "--max-columns", NzT.toString(), "--trim", "--max-count", BzT.toString()];
  if (!R.caseSensitive) e.push("-i");
  if (R.literal) e.push("--fixed-strings");
  if (e.push("--regexp", R.pattern), R.path) c4T(R.path), e.push(An(R.path) ? R.path : MR.joinPath(T, R.path).fsPath);else e.push(T.fsPath);
  let t = R?.glob ? O2R.default(R.glob, {
    nocase: !R.caseSensitive,
    dot: !0
  }) : void 0;
  return gh(faT()).pipe(L9(r => Ej(r, e, {
    stdio: ["ignore", "pipe", "pipe"]
  })), JR(({
    stdout: r,
    stderr: h,
    exitCode: i,
    exited: c
  }) => {
    let s = r.trim().split(`
`).filter(A => {
      if (A.length === 0) return !1;
      if (t) {
        let [l] = A.split(":", 1);
        if (l && !t(l)) return !1;
      }
      return !0;
    });
    if (!c) return {
      status: "in-progress",
      progress: s
    };
    if (c && i && i >= 2) return {
      status: "error",
      progress: s,
      error: {
        message: `ripgrep exited with code ${i}`
      }
    };
    return {
      status: "done",
      progress: s,
      result: s
    };
  }), vs(r => AR.of({
    status: "error",
    progress: [],
    error: {
      message: String(r)
    }
  })));
}