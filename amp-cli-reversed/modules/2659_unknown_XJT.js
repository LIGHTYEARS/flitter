function XJT(T, R = 0, a = T.length) {
  let e = T[R] === "'",
    t = T[R++] === T[R] && T[R] === T[R + 1];
  if (t) {
    if (a -= 2, T[R += 2] === "\r") R++;
    if (T[R] === `
`) R++;
  }
  let r = 0,
    h,
    i = "",
    c = R;
  while (R < a - 1) {
    let s = T[R++];
    if (s === `
` || s === "\r" && T[R] === `
`) {
      if (!t) throw new A8("newlines are not allowed in strings", {
        toml: T,
        ptr: R - 1
      });
    } else if (s < " " && s !== "\t" || s === "\x7F") throw new A8("control characters are not allowed in strings", {
      toml: T,
      ptr: R - 1
    });
    if (h) {
      if (h = !1, s === "x" || s === "u" || s === "U") {
        let A = T.slice(R, R += s === "x" ? 2 : s === "u" ? 4 : 8);
        if (!R70.test(A)) throw new A8("invalid unicode escape", {
          toml: T,
          ptr: r
        });
        try {
          i += String.fromCodePoint(parseInt(A, 16));
        } catch {
          throw new A8("invalid unicode escape", {
            toml: T,
            ptr: r
          });
        }
      } else if (t && (s === `
` || s === " " || s === "\t" || s === "\r")) {
        if (R = ws(T, R - 1, !0), T[R] !== `
` && T[R] !== "\r") throw new A8("invalid escape: only line-ending whitespace may be escaped", {
          toml: T,
          ptr: r
        });
        R = ws(T, R);
      } else if (s in XIT) i += XIT[s];else throw new A8("unrecognized escape sequence", {
        toml: T,
        ptr: r
      });
      c = R;
    } else if (!e && s === "\\") r = R - 1, h = !0, i += T.slice(c, r);
  }
  return i + T.slice(c, a - 1);
}