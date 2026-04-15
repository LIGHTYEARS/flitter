function ybR(T) {
  let R = [],
    a = "",
    e = !1,
    t = "",
    r = 1,
    h = 1;
  for (let c = 0; c < T.length; c++) {
    let s = T[c];
    if (!e && (s === '"' || s === "'")) e = !0, t = s, a += s;else if (e && s === t) {
      let A = 0,
        l = c - 1;
      while (l >= 0 && T[l] === "\\") A++, l--;
      if (A % 2 === 0) e = !1, t = "";
      a += s;
    } else if (!e && s === `
`) {
      let A = a.trim();
      if (A) R.push({
        content: A,
        lineNumber: h
      });
      a = "", r++, h = r;
    } else if (s === `
`) a += s, r++;else a += s;
  }
  let i = a.trim();
  if (i) R.push({
    content: i,
    lineNumber: h
  });
  return R;
}