function SgT(T) {
  return T.split(`
`).filter(R => R.trim() !== "").slice(-3);
}
function hq0(T, R) {
  if (T.toolRun?.status === "done" && typeof T.toolRun.result === "string") return new fp({
    diff: T.toolRun.result,
    filePath: T.path
  });
  if (T.toolRun?.status === "error" && T.toolRun.error) return new uR({
    padding: TR.only({
      left: 2
    }),
    child: new xT({
      text: new G(String(T.toolRun.error), new cT({
        color: R.app.toolError
      })),
      selectable: !0
    })
  });
  let a = T.toolRun?.status === "in-progress" || T.toolRun?.status === "queued";
  return new xT({
    text: new G(a ? "Reverting..." : "No diff available.", new cT({
      color: R.colors.mutedForeground
    })),
    selectable: !0
  });
}