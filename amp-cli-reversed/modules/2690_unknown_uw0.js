function uw0(T) {
  if (typeof T === "function") return T;
  if (Array.isArray(T)) return R => {
    for (let a of T) {
      if (typeof a === "string" && R === a) return !0;
      if (a instanceof RegExp && a.test(R)) return !0;
    }
  };
  return () => !1;
}