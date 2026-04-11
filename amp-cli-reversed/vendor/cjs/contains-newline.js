// Module: contains-newline
// Original: K9T
// Type: CJS (RT wrapper)
// Exports: containsNewline
// Category: util

// Module: K9T (CJS)
(T) => {
  function R(a) {
    if (!a) return null;
    switch (a.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (
          a.source.includes(`
`)
        )
          return !0;
        if (a.end) {
          for (let e of a.end) if (e.type === "newline") return !0;
        }
        return !1;
      case "flow-collection":
        for (let e of a.items) {
          for (let t of e.start) if (t.type === "newline") return !0;
          if (e.sep) {
            for (let t of e.sep) if (t.type === "newline") return !0;
          }
          if (R(e.key) || R(e.value)) return !0;
        }
        return !1;
      default:
        return !0;
    }
  }
  T.containsNewline = R;
};
