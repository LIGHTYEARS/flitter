function Jm(T, R) {
  if (!T || T.length === 0) return;
  let a = T.map(e => `Loaded ${ZA(e.uri)} (${e.lineCount} lines)`).join(`
`);
  return new uR({
    padding: TR.only({
      left: 2
    }),
    child: new xT({
      text: new G(a, new cT({
        color: R.app.toolSuccess,
        dim: !0
      })),
      selectable: !0
    })
  });
}