function VF(T, R, a, e) {
  if (!R || R === "string") return T;
  if (R === "number") {
    let t = Number(T);
    if (Number.isNaN(t)) throw Error(`${a} expects --${e} to be a number, got '${T}'`);
    return t;
  }
  if (R === "boolean") {
    if (T === "true") return !0;
    if (T === "false") return !1;
    if (T !== "true" && T !== "false") throw Error(`${a} expects --${e} to be a boolean (true/false), got '${T}'`);
    return Boolean(T);
  }
  return T;
}