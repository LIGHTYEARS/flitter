function iE0(T, R) {
  let a = new cT({
      color: R.colors.foreground,
      dim: !0
    }),
    e = new cT({
      color: R.app.toolError
    }),
    t = [];
  if (T.status === "error" && T.error) t.push(new xT({
    text: new G(`Error: ${T.error}`, e),
    selectable: !0
  }));
  switch (T.kind) {
    case "bash":
      {
        if (T.output) {
          let r = T.output.replace(/\r/g, "").trimEnd().split(`
`),
            h = 15,
            i = [];
          if (r.length > 15) i.push(new G(`[... ${r.length - 15} lines truncated ...]
`, a)), i.push(new G(r.slice(-15).join(`
`), a));else i.push(new G(r.join(`
`), a));
          t.push(new xT({
            text: new G("", void 0, i),
            selectable: !0
          }));
        }
        if (T.status === "done" && T.exitCode !== void 0 && T.exitCode !== 0) t.push(new xT({
          text: new G(`exit code: ${T.exitCode}`, new cT({
            color: R.colors.destructive
          })),
          selectable: !0
        }));
        break;
      }
    case "edit":
      {
        if (T.diff) t.push(cE0(T.diff, R));
        break;
      }
    case "create-file":
      {
        if (T.content) {
          let r = T.content.split(`
`),
            h = r.slice(0, 10).join(`
`),
            i = r.length > 10 ? `
... ${r.length - 10} more lines` : "";
          t.push(new xT({
            text: new G(h + i, a),
            selectable: !0
          }));
        }
        break;
      }
    case "generic":
      {
        if (T.args) t.push(new xT({
          text: new G(T.args, a),
          selectable: !0
        }));
        break;
      }
  }
  if (t.length === 0) return new SR();
  return new uR({
    padding: TR.only({
      left: 2
    }),
    child: new xR({
      crossAxisAlignment: "start",
      children: t
    })
  });
}