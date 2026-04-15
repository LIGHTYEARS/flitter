function a70(T, R, a, e) {
  if (T === "true") return !0;
  if (T === "false") return !1;
  if (T === "-inf") return -1 / 0;
  if (T === "inf" || T === "+inf") return 1 / 0;
  if (T === "nan" || T === "+nan" || T === "-nan") return NaN;
  if (T === "-0") return e ? 0n : 0;
  let t = ZD0.test(T);
  if (t || JD0.test(T)) {
    if (T70.test(T)) throw new A8("leading zeroes are not allowed", {
      toml: R,
      ptr: a
    });
    T = T.replace(/_/g, "");
    let h = +T;
    if (isNaN(h)) throw new A8("invalid number", {
      toml: R,
      ptr: a
    });
    if (t) {
      if ((t = !Number.isSafeInteger(h)) && !e) throw new A8("integer value cannot be represented losslessly", {
        toml: R,
        ptr: a
      });
      if (t || e === !0) h = BigInt(T);
    }
    return h;
  }
  let r = new pP(T);
  if (!r.isValid()) throw new A8("invalid value", {
    toml: R,
    ptr: a
  });
  return r;
}