function mwT(T) {
  return R.withOptions = a => mwT(pAT(pAT({}, T), a)), R;
  function R(a, ...e) {
    let t = typeof a === "string" ? [a] : a.raw,
      {
        escapeSpecialCharacters: r = Array.isArray(a),
        trimWhitespace: h = !0
      } = T,
      i = "";
    for (let A = 0; A < t.length; A++) {
      let l = t[A];
      if (r) l = l.replace(/\\\n[ \t]*/g, "").replace(/\\`/g, "`").replace(/\\\$/g, "$").replace(/\\\{/g, "{");
      if (i += l, A < e.length) i += e[A];
    }
    let c = i.split(`
`),
      s = null;
    for (let A of c) {
      let l = A.match(/^(\s+)\S+/);
      if (l) {
        let o = l[1].length;
        if (!s) s = o;else s = Math.min(s, o);
      }
    }
    if (s !== null) {
      let A = s;
      i = c.map(l => l[0] === " " || l[0] === "\t" ? l.slice(A) : l).join(`
`);
    }
    if (h) i = i.trim();
    if (r) i = i.replace(/\\n/g, `
`);
    return i;
  }
}