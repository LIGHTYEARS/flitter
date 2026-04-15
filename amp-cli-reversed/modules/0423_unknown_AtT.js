function AtT(T, R = {}) {
  let a = {
      baseIndent: "  ",
      descriptionIndent: "    ",
      labelColor: oR.green
    },
    {
      baseIndent: e,
      descriptionIndent: t,
      labelColor: r
    } = {
      ...a,
      ...R
    };
  if (T.length === 0) return "";
  return T.map(([h, i]) => {
    let c = r(h),
      s = e + t,
      A = (process.stdout.columns || 120) - s.length,
      l = SVT(i, A).split(`
`).map((o, n) => n === 0 ? o : s + o).join(`
`);
    return e + c + `
` + s + l;
  }).join(`
`) + `
`;
}