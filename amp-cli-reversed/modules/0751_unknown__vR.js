function _vR(T, R) {
  let a = {},
    e = H(T, ["ttl"]);
  if (R !== void 0 && e != null) Y(R, ["ttl"], e);
  let t = H(T, ["expireTime"]);
  if (R !== void 0 && t != null) Y(R, ["expireTime"], t);
  let r = H(T, ["displayName"]);
  if (R !== void 0 && r != null) Y(R, ["displayName"], r);
  let h = H(T, ["contents"]);
  if (R !== void 0 && h != null) {
    let l = ui(h);
    if (Array.isArray(l)) l = l.map(o => {
      return o;
    });
    Y(R, ["contents"], l);
  }
  let i = H(T, ["systemInstruction"]);
  if (R !== void 0 && i != null) Y(R, ["systemInstruction"], it(i));
  let c = H(T, ["tools"]);
  if (R !== void 0 && c != null) {
    let l = c;
    if (Array.isArray(l)) l = l.map(o => {
      return NvR(o);
    });
    Y(R, ["tools"], l);
  }
  let s = H(T, ["toolConfig"]);
  if (R !== void 0 && s != null) Y(R, ["toolConfig"], s);
  let A = H(T, ["kmsKeyName"]);
  if (R !== void 0 && A != null) Y(R, ["encryption_spec", "kmsKeyName"], A);
  return a;
}