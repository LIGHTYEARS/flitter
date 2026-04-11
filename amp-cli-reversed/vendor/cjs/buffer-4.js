// Module: buffer-4
// Original: zyR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: zyR (CJS)
(T, R) => {
  var a = qT("fs"),
    e = qyR();
  function t(r) {
    let h = Buffer.alloc(150),
      i;
    try {
      ((i = a.openSync(r, "r")), a.readSync(i, h, 0, 150, 0), a.closeSync(i));
    } catch (c) {}
    return e(h.toString());
  }
  R.exports = t;
};
