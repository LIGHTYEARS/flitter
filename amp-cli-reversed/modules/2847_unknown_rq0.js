function rq0(T, R) {
  if (T.toolRun?.status === "done" && typeof T.toolRun.result === "object" && T.toolRun.result) {
    let e = T.toolRun.result;
    if (e.diff) return new fp({
      diff: e.diff,
      filePath: T.path
    });
  }
  if (T.toolRun?.status === "error" && T.toolRun.error) return new uR({
    padding: TR.only({
      left: 2
    }),
    child: new xT({
      text: new G(T.toolRun.error.message, new cT({
        color: R.app.toolError
      })),
      selectable: !0
    })
  });
  let a = T.toolRun?.status === "in-progress" || T.toolRun?.status === "queued";
  return new xT({
    text: new G(a ? "Editing..." : "No diff available.", new cT({
      color: R.colors.mutedForeground
    })),
    selectable: !0
  });
}