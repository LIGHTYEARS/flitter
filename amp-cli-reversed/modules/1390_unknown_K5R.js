function K5R(T, R, a) {
  let e = [],
    t = 0;
  for (let r of a) {
    let h = !1;
    if (r.changeContext) {
      let A = r.changeContext.split(`
`),
        l = oz(T, A, t);
      if (l) t = l.index + A.length, h = !0;
    }
    let {
      oldLines: i,
      newLines: c
    } = r;
    if (i.length === 0) {
      let A = h ? t : T.length,
        l = e.at(-1);
      if (l && l.startLine === A && l.deleteCount === 0) {
        l.insertLines.push(...c);
        continue;
      }
      e.push({
        startLine: A,
        deleteCount: 0,
        insertLines: c
      });
      continue;
    }
    let s = oz(T, i, t, r.isEndOfFile);
    if (!s && i.length > 0 && i[i.length - 1] === "") {
      if (i = i.slice(0, -1), c.length > 0 && c[c.length - 1] === "") c = c.slice(0, -1);
      s = oz(T, i, t, r.isEndOfFile);
    }
    if (s) {
      let A = T.slice(s.index, s.index + i.length),
        l = F5R(A, i, c, s.kind);
      e.push({
        startLine: s.index,
        deleteCount: i.length,
        insertLines: l
      }), t = s.index + i.length;
    } else {
      let A = r.changeContext ? ` near "${r.changeContext}"` : "",
        l = i.length > 0 ? `
Expected to find:
${i.slice(0, 3).map(n => `  "${n}"`).join(`
`)}${i.length > 3 ? `
  ...` : ""}` : "",
        o = z5R(T, i);
      throw Error(`Could not find matching lines in ${R}${A}.${l}${o}`);
    }
  }
  return G5R(e, R), e;
}