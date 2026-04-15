function b1(T, R, a, e, t, r) {
  if (T === "json") {
    let h;
    if (typeof R === "string") h = hPT(R);else {
      let c = new TextDecoder("utf-8").decode(R);
      h = hPT(c);
    }
    let i = e.parse(h);
    return t(i);
  } else if (T === "cbor") {
    FyT.default(typeof R !== "string", "buffer cannot be string for cbor encoding");
    let h = kb(R),
      i = e.parse(h);
    return t(i);
  } else if (T === "bare") {
    if (FyT.default(typeof R !== "string", "buffer cannot be string for bare encoding"), !a) throw Error("VersionedDataHandler is required for 'bare' encoding");
    let h = a.deserializeWithEmbeddedVersion(R);
    return r(h);
  } else FO(T);
}