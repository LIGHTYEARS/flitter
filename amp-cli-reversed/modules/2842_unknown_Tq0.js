function Tq0(T, R, a, e) {
  let t = T.toolResult.run,
    r = t.status === "done" && typeof t.result === "object" && t.result ? t.result.output : void 0,
    h = t.status === "done" && typeof t.result === "object" && t.result ? t.result.exitCode : void 0,
    i = e?.content;
  return {
    type: "bash",
    id: T.id,
    sourceIndex: a,
    status: t.status,
    command: R,
    guidanceFiles: $b(t),
    output: r,
    error: t.status === "error" && t.error ? t.error.message : void 0,
    exitCode: h,
    progressOutput: i
  };
}