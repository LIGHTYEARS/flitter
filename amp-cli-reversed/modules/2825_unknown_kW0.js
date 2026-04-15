function yW0(T) {
  return T?.status === "error" && typeof T.error === "object" && "message" in T.error;
}
function vgT(T) {
  return T.split(`
`).filter(R => R.trim() !== "").slice(-3);
}
function PW0(T) {
  if (!T.content) return;
  let R = xx(T.content);
  return R.added > 0 ? `+${R.added}` : void 0;
}
function kW0(T, R) {
  if (T.content) {
    let e = T.content.endsWith(`
`) ? T.content : `${T.content}
`,
      t = $A(null, e).split(`
`).slice(0, -1).join(`
`);
    return new fp({
      diff: t,
      filePath: T.path
    });
  }
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
    text: new G(a ? "Creating..." : "No content available.", new cT({
      color: R.colors.mutedForeground
    })),
    selectable: !0
  });
}