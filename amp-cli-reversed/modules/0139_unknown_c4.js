function c4(T, R) {
  switch ((R == null ? void 0 : R.type) ?? "text") {
    case "text":
      return u2T.decode(T);
    case "arrayBuffer":
      {
        let a = new Uint8Array(T.byteLength);
        return a.set(T), a.buffer;
      }
    case "binary":
      return T;
    default:
      throw TypeError("Invalid kv value type");
  }
}