function vm0(T, R) {
  switch (T.split(" ")[0]) {
    case "keyword":
    case "important":
    case "atrule":
      return R.keyword;
    case "string":
    case "char":
    case "regex":
    case "url":
    case "selector":
    case "attr-value":
    case "inserted":
      return R.string;
    case "number":
    case "constant":
    case "boolean":
    case "symbol":
      return R.number;
    case "comment":
    case "prolog":
    case "doctype":
    case "cdata":
      return R.comment;
    case "function":
    case "class":
      return R.function;
    case "variable":
    case "property":
    case "attr-name":
    case "class-name":
      return R.variable;
    case "type":
    case "tag":
      return R.type;
    case "operator":
    case "punctuation":
    case "delimiter":
    case "entity":
    case "builtin":
    case "deleted":
      return R.operator;
    default:
      return R.operator;
  }
}