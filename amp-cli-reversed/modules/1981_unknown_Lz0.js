function Lz0(T) {
  process.emitWarning = (R, a, e, t) => {
    let r = typeof R === "string" ? R : R.message || String(R),
      h = a || "Warning",
      i = !1;
    T.warn(r, {
      name: h,
      code: e
    });
  };
}