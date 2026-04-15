function b8R(T, R) {
  if (R.length === 0) return null;
  let a = [];
  for (let e of R) a.push(new xT({
    text: new G(`Loaded ${ZA(e.uri)} (${e.lineCount} lines)`, new cT({
      color: $R.of(T).app.toolSuccess,
      dim: !0
    })),
    selectable: !0
  }));
  if (a.length === 1) return a[0];
  return new xR({
    mainAxisSize: "min",
    crossAxisAlignment: "start",
    children: a
  });
}