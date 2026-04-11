// Module: flow-indent-check
// Original: UDT
// Type: CJS (RT wrapper)
// Exports: flowIndentCheck
// Category: util

// Module: UDT (CJS)
(T) => {
  var R = K9T();
  function a(e, t, r) {
    if (t?.type === "flow-collection") {
      let h = t.end[0];
      if (
        h.indent === e &&
        (h.source === "]" || h.source === "}") &&
        R.containsNewline(t)
      )
        r(
          h,
          "BAD_INDENT",
          "Flow end indicator should be more indented than parent",
          !0,
        );
    }
  }
  T.flowIndentCheck = a;
};
