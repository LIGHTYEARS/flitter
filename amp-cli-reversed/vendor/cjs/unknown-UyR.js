// Module: unknown-UyR
// Original: UyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: UyR (CJS)
(T, R) => {
  var a = qT("path"),
    e = ByR(),
    t = NyR();
  function r(i, c) {
    let s = i.options.env || process.env,
      A = process.cwd(),
      l = i.options.cwd != null,
      o = l && process.chdir !== void 0 && !process.chdir.disabled;
    if (o)
      try {
        process.chdir(i.options.cwd);
      } catch (p) {}
    let n;
    try {
      n = e.sync(i.command, {
        path: s[t({ env: s })],
        pathExt: c ? a.delimiter : void 0,
      });
    } catch (p) {
    } finally {
      if (o) process.chdir(A);
    }
    if (n) n = a.resolve(l ? i.options.cwd : "", n);
    return n;
  }
  function h(i) {
    return r(i) || r(i, !0);
  }
  R.exports = h;
};
