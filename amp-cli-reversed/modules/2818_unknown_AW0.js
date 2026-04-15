function AW0(T, R) {
  let a = new cT({
      color: R.colors.mutedForeground,
      dim: !0
    }),
    e = T.detail ? new xT({
      text: new G(T.detail, a),
      selectable: !0
    }) : void 0,
    t = Jm(T.guidanceFiles, R);
  if (e && t) return new xR({
    crossAxisAlignment: "start",
    children: [e, new uR({
      padding: TR.only({
        top: 1
      }),
      child: t
    })]
  });
  if (e) return e;
  if (t) return t;
  return new xT({
    text: new G("", a)
  });
}