// Module: to-js
// Original: ym
// Type: CJS (RT wrapper)
// Exports: toJS
// Category: util

// Module: ym (CJS)
(T) => {
  var R = x8();
  function a(e, t, r) {
    if (Array.isArray(e)) return e.map((h, i) => a(h, String(i), r));
    if (e && typeof e.toJSON === "function") {
      if (!r || !R.hasAnchor(e)) return e.toJSON(t, r);
      let h = { aliasCount: 0, count: 1, res: void 0 };
      (r.anchors.set(e, h),
        (r.onCreate = (c) => {
          ((h.res = c), delete r.onCreate);
        }));
      let i = e.toJSON(t, r);
      if (r.onCreate) r.onCreate(i);
      return i;
    }
    if (typeof e === "bigint" && !r?.keep) return Number(e);
    return e;
  }
  T.toJS = a;
};
