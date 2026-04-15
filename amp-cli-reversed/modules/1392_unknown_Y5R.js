function Y5R(T, R) {
  let a = T.split(`
`),
    e = R.split(`
`),
    t = [];
  t.push("--- a/file"), t.push("+++ b/file");
  let r = 0,
    h = 0;
  while (r < a.length || h < e.length) {
    let i = a[r],
      c = e[h];
    if (i === c) t.push(` ${i ?? ""}`), r++, h++;else if (i !== void 0 && (c === void 0 || i !== e[h])) t.push(`-${i}`), r++;else t.push(`+${c ?? ""}`), h++;
  }
  return t.join(`
`);
}