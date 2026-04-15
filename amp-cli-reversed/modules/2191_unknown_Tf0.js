function Tf0(T) {
  if (T === null || typeof T !== "object" || Array.isArray(T)) return !0;
  if (typeof T.type !== "string") return !1;
  let R = T,
    a = Object.keys(T);
  for (let e of a) {
    let t = R[e];
    if (t && typeof t === "object") {
      if (!Array.isArray(t)) return !0;
      let r = t;
      for (let h of r) if (typeof h !== "number" && typeof h !== "string") return !0;
    }
  }
  if ("children" in T && Array.isArray(T.children)) return !0;
  return !1;
}