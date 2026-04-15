function NXT(T, R, a, e) {
  let t = BET(T),
    r = qET(T),
    h = "\x1B[0m",
    i = "\x1B[32m",
    c = "\x1B[33m",
    s = "\x1B[31m",
    A = "\x1B[34m",
    l = "\x1B[90m",
    o = "\x1B[2m",
    n = [];
  if (T.archived) n.push("\x1B[90m\x1B[2mArchived\x1B[0m");
  if (n.push(`${t}`), n.push(`\x1B[34m${R}\x1B[0m`), r.added > 0 || r.changed > 0 || r.deleted > 0) {
    let O = [];
    if (r.added > 0) O.push(`\x1B[32m+${r.added}\x1B[0m`);
    if (r.changed > 0) O.push(`\x1B[33m~${r.changed}\x1B[0m`);
    if (r.deleted > 0) O.push(`\x1B[31m-${r.deleted}\x1B[0m`);
    n.push(`${O.join(" ")}`);
  }
  n.push(`\x1B[90mamp threads continue ${T.id}\x1B[0m`);
  let p = 14,
    _ = 7,
    m = new Zx(p, _),
    b = new Xk(42),
    y = new SH(p, _, p, _, p, _, 0, T.agentMode ?? "smart", "intensity", void 0, void 0, LT.default(), b);
  y.layout(o0.tight(p, _)), y.paint(m, 0, 0);
  let u = m.getBuffer().getCells(),
    P = 0;
  for (let O = 0; O < _; O++) if (u[O].some(j => j.char !== " ")) {
    P = O;
    break;
  }
  let k = _ - 1;
  for (let O = _ - 1; O >= 0; O--) if (u[O].some(j => j.char !== " ")) {
    k = O;
    break;
  }
  function x(O, j) {
    if (!O) return "";
    if (O.type === "rgb") {
      let {
        r: d,
        g: C,
        b: L
      } = O.value;
      if (a.getColorDepth() >= 24) return `\x1B[${j ? 38 : 48};2;${d};${C};${L}m`;
      let w = PtT(d, C, L);
      return `\x1B[${j ? 38 : 48};5;${w}m`;
    }
    return "";
  }
  let f = [];
  if (k >= P) for (let O = P; O <= k; O++) {
    let j = "";
    for (let d = 0; d < p; d++) {
      let C = u[O][d],
        L = C.char,
        w = x(C.style.fg, !0);
      j += w + L + "\x1B[0m";
    }
    f.push(j);
  }
  let v = f.length,
    g = Math.max(v, n.length),
    I = Math.floor((g - v) / 2),
    S = Math.floor((g - n.length) / 2);
  for (let O = 0; O < g; O++) {
    let j = " ".repeat(p);
    if (O >= I && O < I + v) j = f[O - I];
    let d = "   ",
      C = "";
    if (O >= S && O < S + n.length) C = n[O - S];
    a.write(j + d + C + `
`);
  }
  if (e) a.write(`
\x1B[90m${e}\x1B[0m
`);
}