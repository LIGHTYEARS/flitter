// Module: grpc-parser-2
// Original: QA
// Type: CJS (RT wrapper)
// Exports: Alias, CST, Composer, Document, Lexer, LineCounter, Pair, Parser, Scalar, Schema, YAMLError, YAMLMap, YAMLParseError, YAMLSeq, YAMLWarning, isAlias, isCollection, isDocument, isMap, isNode, isPair, isScalar, isSeq, parse, parseAllDocuments, parseDocument, stringify, visit, visitAsync
// Category: npm-pkg

// Module: Qa (CJS)
(T) => {
  var R = x8(),
    a = W9T(),
    e = ym(),
    t = (h) => !h || (typeof h !== "function" && typeof h !== "object");
  class r extends a.NodeBase {
    constructor(h) {
      super(R.SCALAR);
      this.value = h;
    }
    toJSON(h, i) {
      return i?.keep ? this.value : e.toJS(this.value, h, i);
    }
    toString() {
      return String(this.value);
    }
  }
  ((r.BLOCK_FOLDED = "BLOCK_FOLDED"),
    (r.BLOCK_LITERAL = "BLOCK_LITERAL"),
    (r.PLAIN = "PLAIN"),
    (r.QUOTE_DOUBLE = "QUOTE_DOUBLE"),
    (r.QUOTE_SINGLE = "QUOTE_SINGLE"),
    (T.Scalar = r),
    (T.isScalarValue = t));
};
