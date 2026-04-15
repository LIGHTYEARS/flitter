function dyT(T, R) {
  switch ((R == null ? void 0 : R.type) ?? wR0(T)) {
    case "text":
      if (typeof T !== "string") throw TypeError("Expected a string when type is text");
      return m2T.encode(T);
    case "arrayBuffer":
      if (!(T instanceof ArrayBuffer)) throw TypeError("Expected an ArrayBuffer when type is arrayBuffer");
      return new Uint8Array(T);
    case "binary":
      if (!(T instanceof Uint8Array)) throw TypeError("Expected a Uint8Array when type is binary");
      return T;
    default:
      throw TypeError("Invalid kv value type");
  }
}