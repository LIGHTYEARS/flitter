function DN0(T) {
  return T ? "$$" : "$";
}
function YTR(T) {
  let R = T.app.shellMode,
    a = T.app.shellModeHidden;
  return [{
    match: e => e.startsWith("$$"),
    display: "$$",
    style: new cT({
      color: a
    }),
    spacing: 1,
    concealPrefix: !0
  }, {
    match: e => e.startsWith("$") && !e.startsWith("$$"),
    display: "$",
    style: new cT({
      color: R
    }),
    spacing: 1,
    concealPrefix: !0
  }];
}