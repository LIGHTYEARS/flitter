// Module: unknown-DyR
// Original: DyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: DyR (CJS)
(T, R) => {
  ((R.exports = e), (e.sync = t));
  var a = qT("fs");
  function e(i, c, s) {
    a.stat(i, function (A, l) {
      s(A, A ? !1 : r(l, c));
    });
  }
  function t(i, c) {
    return r(a.statSync(i), c);
  }
  function r(i, c) {
    return i.isFile() && h(i, c);
  }
  function h(i, c) {
    var { mode: s, uid: A, gid: l } = i,
      o = c.uid !== void 0 ? c.uid : process.getuid && process.getuid(),
      n = c.gid !== void 0 ? c.gid : process.getgid && process.getgid(),
      p = parseInt("100", 8),
      _ = parseInt("010", 8),
      m = parseInt("001", 8),
      b = p | _,
      y =
        s & m || (s & _ && l === n) || (s & p && A === o) || (s & b && o === 0);
    return y;
  }
};
