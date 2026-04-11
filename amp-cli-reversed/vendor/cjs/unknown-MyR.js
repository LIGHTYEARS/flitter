// Module: unknown-MyR
// Original: MyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: MyR (CJS)
(T, R) => {
  ((R.exports = r), (r.sync = h));
  var a = qT("fs");
  function e(i, c) {
    var s = c.pathExt !== void 0 ? c.pathExt : process.env.PATHEXT;
    if (!s) return !0;
    if (((s = s.split(";")), s.indexOf("") !== -1)) return !0;
    for (var A = 0; A < s.length; A++) {
      var l = s[A].toLowerCase();
      if (l && i.substr(-l.length).toLowerCase() === l) return !0;
    }
    return !1;
  }
  function t(i, c, s) {
    if (!i.isSymbolicLink() && !i.isFile()) return !1;
    return e(c, s);
  }
  function r(i, c, s) {
    a.stat(i, function (A, l) {
      s(A, A ? !1 : t(l, i, c));
    });
  }
  function h(i, c) {
    return t(a.statSync(i), i, c);
  }
};
