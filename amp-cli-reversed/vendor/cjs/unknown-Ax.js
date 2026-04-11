// Module: unknown-Ax
// Original: Ax
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: Ax (CJS)
(T) => {
  var R = T,
    a = Fe(),
    e = [
      "double",
      "float",
      "int32",
      "uint32",
      "sint32",
      "fixed32",
      "sfixed32",
      "int64",
      "uint64",
      "sint64",
      "fixed64",
      "sfixed64",
      "bool",
      "string",
      "bytes",
    ];
  function t(r, h) {
    var i = 0,
      c = {};
    h |= 0;
    while (i < r.length) c[e[i + h]] = r[i++];
    return c;
  }
  ((R.basic = t([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2, 2])),
    (R.defaults = t([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      !1,
      "",
      a.emptyArray,
      null,
    ])),
    (R.long = t([0, 0, 0, 1, 1], 7)),
    (R.mapKey = t([0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2], 2)),
    (R.packed = t([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0])));
};
