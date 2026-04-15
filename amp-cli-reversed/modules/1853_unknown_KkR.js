function KkR(T) {
  let R = T.diff.split(`
`),
    a = 0,
    e = 0,
    t = 0;
  for (let i of R) {
    if (i.startsWith("+") && !i.startsWith("+++")) a++;
    if (i.startsWith("-") && !i.startsWith("---")) e++;
    if (i.startsWith("@")) t++;
  }
  let r = T.reverted,
    h = T.isNewFile === !0;
  if (h) a = T.after.split(`
`).length, e = 0, t = 0;
  return {
    added: a,
    removed: e,
    modified: t,
    created: h,
    reverted: r
  };
}