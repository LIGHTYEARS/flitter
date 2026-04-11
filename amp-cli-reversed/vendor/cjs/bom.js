// Module: bom
// Original: V9T
// Type: CJS (RT wrapper)
// Exports: BOM, DOCUMENT, FLOW_END, SCALAR, createScalarToken, isCollection, isScalar, prettyToken, resolveAsScalar, setScalarValue, stringify, tokenType, visit
// Category: util

// Module: V9T (CJS)
(T) => {
  var R = TkR(),
    a = RkR(),
    e = akR(),
    t = "\uFEFF",
    r = "\x02",
    h = "\x18",
    i = "\x1F",
    c = (o) => !!o && "items" in o,
    s = (o) =>
      !!o &&
      (o.type === "scalar" ||
        o.type === "single-quoted-scalar" ||
        o.type === "double-quoted-scalar" ||
        o.type === "block-scalar");
  function A(o) {
    switch (o) {
      case t:
        return "<BOM>";
      case r:
        return "<DOC>";
      case h:
        return "<FLOW_END>";
      case i:
        return "<SCALAR>";
      default:
        return JSON.stringify(o);
    }
  }
  function l(o) {
    switch (o) {
      case t:
        return "byte-order-mark";
      case r:
        return "doc-mode";
      case h:
        return "flow-error-end";
      case i:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (o[0]) {
      case " ":
      case "\t":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }
  ((T.createScalarToken = R.createScalarToken),
    (T.resolveAsScalar = R.resolveAsScalar),
    (T.setScalarValue = R.setScalarValue),
    (T.stringify = a.stringify),
    (T.visit = e.visit),
    (T.BOM = t),
    (T.DOCUMENT = r),
    (T.FLOW_END = h),
    (T.SCALAR = i),
    (T.isCollection = c),
    (T.isScalar = s),
    (T.prettyToken = A),
    (T.tokenType = l));
};
