function G50(T) {
  let R = rf(T)?.workspaceFolders?.[0];
  return R ? zR.parse(R).fsPath : process.cwd();
}
function JM(T, R) {
  if (T.startsWith("file://")) return zR.parse(T).toString();
  let a = dgT.isAbsolute(T) ? T : dgT.resolve(G50(R), T);
  return zR.file(a).toString();
}
function WQ(T, R, a, e) {
  let t = nhT(R);
  if (t === "apply_patch") return X50(T, a);
  let r = $R.of(T),
    h = a.status === "in-progress" || a.status === "queued" ? "\u22EF" : xW(a.status),
    i = qr(a.status, r),
    c = new cT({
      color: r.colors.foreground,
      dim: !0
    }),
    s = new cT({
      color: r.app.toolName,
      bold: !0
    }),
    A = e?.nameOverride ?? F50(t),
    l = V50(R),
    o = K50(t, a.status);
  if (o) {
    let p = l ? new xT({
      text: new G(l, c),
      selectable: !0,
      maxLines: 1,
      overflow: "ellipsis"
    }) : void 0;
    return new x3({
      name: A,
      status: o,
      children: p ? [p] : void 0
    });
  }
  let n = [new G(`${h} `, new cT({
    color: i
  })), new G(A, s)];
  if (l) n.push(new G(` ${l}`, c));
  return new xT({
    text: new G("", void 0, n),
    selectable: !0,
    maxLines: 1,
    overflow: "ellipsis"
  });
}