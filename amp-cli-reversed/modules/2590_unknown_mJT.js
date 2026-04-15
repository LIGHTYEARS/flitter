function mJT(T, R) {
  let a = "  ".repeat(R),
    e = T.key ? `--${T.key}` : "item",
    t = T.description ? `: ${T.description}` : "",
    r = `${a}${e} (${T.type})${t}`;
  if (T.children.length === 0) return r;
  let h = T.children.map(i => mJT(i, R + 1));
  return [r, ...h].join(`
`);
}