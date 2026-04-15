function PM0(T) {
  let R = T.split(`
`),
    a = [],
    e = "",
    t = [];
  for (let r of R) {
    let h = r.trim(),
      i = h.match(PJT),
      c = h.match(kJT),
      s = i && i[1] || c && c[1];
    if (s && s.trim()) {
      if (e || t.length > 0) a.push({
        header: e,
        content: t.join(`
`).trim()
      });
      e = s.trim(), t = [];
    } else t.push(r);
  }
  if (e || t.length > 0) a.push({
    header: e,
    content: t.join(`
`).trim()
  });
  return a;
}