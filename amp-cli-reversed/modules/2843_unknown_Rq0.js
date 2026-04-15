function Rq0(T, R, a, e) {
  let t = T.toolResult.run,
    r = T.toolUse.input,
    h = t.status === "done" && typeof t.result === "object" && t.result ? t.result.output : void 0,
    i = t.status === "done" && typeof t.result === "object" && t.result ? t.result.exitCode : void 0,
    c = e?.content;
  return {
    type: "shell-command",
    id: T.id,
    sourceIndex: a,
    status: t.status,
    command: R,
    workdir: r?.workdir,
    guidanceFiles: $b(t),
    output: h,
    error: t.status === "error" && t.error ? t.error.message : void 0,
    exitCode: i,
    progressOutput: c
  };
}