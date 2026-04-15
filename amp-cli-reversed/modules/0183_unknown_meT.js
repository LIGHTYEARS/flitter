function S90(T) {
  if (T === "json") return "application/json";else if (T === "cbor" || T === "bare") return "application/octet-stream";else FO(T);
}
function meT(T, R, a, e, t, r, h) {
  if (T === "json") {
    let i = r(R),
      c = t.parse(i);
    return Q2T(c);
  } else if (T === "cbor") {
    let i = r(R),
      c = t.parse(i);
    return Gb(c);
  } else if (T === "bare") {
    if (!a) throw Error("VersionedDataHandler is required for 'bare' encoding");
    if (e === void 0) throw Error("version is required for 'bare' encoding");
    let i = h(R);
    return a.serializeWithEmbeddedVersion(i, e);
  } else FO(T);
}