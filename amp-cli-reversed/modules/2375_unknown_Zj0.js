function Zj0(T, R, a) {
  let e = (a.before || "") + (R || "") + (a.after || ""),
    t = [],
    r = [],
    h = {},
    i = -1;
  while (++i < T.unsafe.length) {
    let A = T.unsafe[i];
    if (!rQT(T.stack, A)) continue;
    let l = T.compilePattern(A),
      o;
    while (o = l.exec(e)) {
      let n = "before" in A || Boolean(A.atBreak),
        p = "after" in A,
        _ = o.index + (n ? o[1].length : 0);
      if (t.includes(_)) {
        if (h[_].before && !n) h[_].before = !1;
        if (h[_].after && !p) h[_].after = !1;
      } else t.push(_), h[_] = {
        before: n,
        after: p
      };
    }
  }
  t.sort(Jj0);
  let c = a.before ? a.before.length : 0,
    s = e.length - (a.after ? a.after.length : 0);
  i = -1;
  while (++i < t.length) {
    let A = t[i];
    if (A < c || A >= s) continue;
    if (A + 1 < s && t[i + 1] === A + 1 && h[A].after && !h[A + 1].before && !h[A + 1].after || t[i - 1] === A - 1 && h[A].before && !h[A - 1].before && !h[A - 1].after) continue;
    if (c !== A) r.push(VfT(e.slice(c, A), "\\"));
    if (c = A, /[!-/:-@[-`{-~]/.test(e.charAt(A)) && (!a.encode || !a.encode.includes(e.charAt(A)))) r.push("\\");else r.push(LA(e.charCodeAt(A))), c++;
  }
  return r.push(VfT(e.slice(c, s), a.after)), r.join("");
}