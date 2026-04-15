function hb0(T, R, a) {
  return String(T).normalize().replaceAll(`\r
`, `
`).split(`
`).map(e => rb0(e, R, a)).join(`
`);
}
function SVT(T, R) {
  return hb0(T, R, {
    hard: !0,
    wordWrap: !0,
    trim: !0
  });
}
function ltT(T, R = {}) {
  let a = {
      baseIndent: "  ",
      firstColumnColor: oR.green
    },
    {
      baseIndent: e,
      firstColumnColor: t
    } = {
      ...a,
      ...R
    };
  if (T.length === 0) return "";
  let r = T.reduce((h, [i]) => Math.max(h, i.length), 0) + 2;
  return T.map(([h, i]) => {
    let c = h.padEnd(r),
      s = t(c),
      A = e + " ".repeat(r),
      l = (process.stdout.columns || 120) - A.length,
      o = SVT(i, l).split(`
`).map((n, p) => p === 0 ? n : A + n).join(`
`);
    return e + s + o;
  }).join(`
`) + `
`;
}