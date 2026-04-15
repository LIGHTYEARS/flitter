function UzR(T, R = DuT) {
  let a = Math.max(0, R.maxCharacterLength ?? DuT.maxCharacterLength),
    e = T.split(`
`),
    t = 0,
    r = [];
  for (let h = e.length - 1; h >= 0; h--) {
    let i = e[h] ?? "",
      c = t + i.length;
    if (c > a) {
      if (r.length === 0) r.push(i);
      return {
        output: r.reverse().join(`
`),
        truncation: {
          prefixLinesOmitted: h + 1
        }
      };
    }
    t = c, r.push(i);
  }
  return {
    output: T
  };
}