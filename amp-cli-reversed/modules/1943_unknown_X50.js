function X50(T, R) {
  let a = $R.of(T),
    e = R.status === "in-progress" || R.status === "queued" ? "\u22EF" : xW(R.status),
    t = qr(R.status, a),
    r = new cT({
      color: a.app.toolName,
      bold: !0
    }),
    h = new cT({
      color: a.colors.foreground,
      dim: !0
    }),
    i = Y50(R),
    c = [new G(`${e} `, new cT({
      color: t
    })), new G("Apply Patch", r)];
  if (i) {
    if (c.push(new G(` ${i.fileCount} ${o9(i.fileCount, "file")} ${i.totalChanges} ${o9(i.totalChanges, "change")}`, h)), i.totalAdditions > 0) c.push(new G(` +${i.totalAdditions}`, new cT({
      color: a.app.diffAdded
    })));
    if (i.totalDeletions > 0) c.push(new G(` -${i.totalDeletions}`, new cT({
      color: a.app.diffRemoved
    })));
  }
  return new xT({
    text: new G("", void 0, c),
    selectable: !0,
    maxLines: 1,
    overflow: "ellipsis"
  });
}