function $U0(T, R, a, e, t, r, h) {
  let i;
  try {
    let p = Z0.of(T),
      _ = $R.of(T);
    i = {
      foreground: p.colorScheme.foreground,
      background: p.colorScheme.background,
      border: _.app.keybind
    };
  } catch {
    i = {
      foreground: {
        type: "index",
        value: 15
      },
      background: {
        type: "index",
        value: 0
      },
      border: {
        type: "index",
        value: 7
      }
    };
  }
  let c = new cT({
      color: i.foreground,
      bold: !0
    }),
    s = new cT({
      color: i.foreground
    }),
    A = new cT({
      color: i.foreground,
      dim: !0
    }),
    l = [],
    o = new cT({
      color: i.foreground,
      underline: !0
    }),
    n = (p, _) => new G(_, o, void 0, QVT(p), () => {
      je(T, p);
    });
  if (e.length <= 1) {
    if (l.push(new G(`${R.label}: `, c)), R.link) l.push(n(R.link, r(R.value)));else l.push(new G(r(R.value), s));
    if (R.meta) l.push(new G(` (${R.meta})`, A));
  } else {
    let p = h === "stacked-bar" || h === "stacked-area";
    l.push(new G(`${R.label}
`, c));
    let _ = 0;
    for (let m = 0; m < e.length; m++) {
      let b = e[m],
        y = b.points[a];
      if (!y) continue;
      _ += y.value;
      let u = b.color ?? t[m % t.length] ?? i.foreground;
      if (l.push(new G("\u25CF ", new cT({
        color: u
      }))), l.push(new G(`${b.name}: `, A)), y.link) l.push(n(y.link, r(y.value)));else l.push(new G(r(y.value), s));
      if (m < e.length - 1 || p) l.push(new G(`
`));
    }
    if (p) l.push(new G("  ", A)), l.push(new G("Total: ", A)), l.push(new G(r(_), s));
  }
  return new SR({
    decoration: {
      color: i.background,
      border: h9.all(new e9(i.border, 1, "rounded"))
    },
    child: new xT({
      text: new G(void 0, void 0, l)
    })
  });
}