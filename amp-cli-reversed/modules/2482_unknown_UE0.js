function DE0(T) {
  for (let R = yIT.length - 1; R >= 0; R--) {
    let a = yIT[R];
    if (T.has(a)) return a;
  }
  return;
}
function PIT(T, R) {
  R.push(new xZT({
    color: T.colors.primary
  })), R.push(y3.horizontal(1));
}
function wE0(T, R, a) {
  a.push(new xT({
    text: new G(R, new cT({
      color: T.colors.foreground,
      dim: !0
    })),
    textAlign: "left",
    maxLines: 1,
    overflow: "clip"
  }));
}
function BE0(T, R, a) {
  a.push(new xT({
    text: new G(R, new cT({
      color: T.colors.destructive
    })),
    textAlign: "left",
    maxLines: 1,
    overflow: "clip"
  }));
}
function NE0(T, R) {
  T.push(new xT({
    text: R,
    textAlign: "left",
    maxLines: 1,
    overflow: "clip"
  }));
}
function UE0(T, R) {
  let a = $R.of(R),
    e = new cT({
      color: a.app.keybind
    }),
    t = new cT({
      color: a.colors.foreground,
      dim: !0
    });
  switch (T) {
    case HtT:
      return new G("", void 0, [new G("Ctrl+C", e), new G(" again to exit", t)]);
    case WtT:
      return new G("", void 0, [new G("Esc", e), new G(" again to cancel", t)]);
  }
}