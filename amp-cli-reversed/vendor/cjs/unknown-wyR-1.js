// Module: unknown-wyR-1
// Original: wyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: wyR (CJS)
(T, R) => {
  var a = qT("fs"),
    e;
  if (global.TESTING_WINDOWS) e = MyR();
  else e = DyR();
  ((R.exports = t), (t.sync = r));
  function t(h, i, c) {
    if (typeof i === "function") ((c = i), (i = {}));
    if (!c) {
      if (typeof Promise !== "function")
        throw TypeError("callback not provided");
      return new Promise(function (s, A) {
        t(h, i || {}, function (l, o) {
          if (l) A(l);
          else s(o);
        });
      });
    }
    e(h, i || {}, function (s, A) {
      if (s) {
        if (s.code === "EACCES" || (i && i.ignoreErrors))
          ((s = null), (A = !1));
      }
      c(s, A);
    });
  }
  function r(h, i) {
    try {
      return e.sync(h, i || {});
    } catch (c) {
      if ((i && i.ignoreErrors) || c.code === "EACCES") return !1;
      else throw c;
    }
  }
};
