function pvR(T, R) {
  let a = {},
    e = H(T, ["ttl"]);
  if (R !== void 0 && e != null) Y(R, ["ttl"], e);
  let t = H(T, ["expireTime"]);
  if (R !== void 0 && t != null) Y(R, ["expireTime"], t);
  let r = H(T, ["displayName"]);
  if (R !== void 0 && r != null) Y(R, ["displayName"], r);
  let h = H(T, ["contents"]);
  if (R !== void 0 && h != null) {
    let A = ui(h);
    if (Array.isArray(A)) A = A.map(l => {
      return zAT(l);
    });
    Y(R, ["contents"], A);
  }
  let i = H(T, ["systemInstruction"]);
  if (R !== void 0 && i != null) Y(R, ["systemInstruction"], zAT(it(i)));
  let c = H(T, ["tools"]);
  if (R !== void 0 && c != null) {
    let A = c;
    if (Array.isArray(A)) A = A.map(l => {
      return BvR(l);
    });
    Y(R, ["tools"], A);
  }
  let s = H(T, ["toolConfig"]);
  if (R !== void 0 && s != null) Y(R, ["toolConfig"], wvR(s));
  if (H(T, ["kmsKeyName"]) !== void 0) throw Error("kmsKeyName parameter is not supported in Gemini API.");
  return a;
}