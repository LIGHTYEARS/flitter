function iw(T) {
  if (typeof T === "number") return T;
  if (typeof T === "string") {
    let R = T.match(/\b(429|[45]\d\d)\b/);
    if (!R?.[1]) return;
    let a = Number(R[1]);
    return Number.isNaN(a) ? void 0 : a;
  }
  if (typeof T !== "object" || T === null) return;
  if ("status" in T && typeof T.status === "number") return T.status;
  if ("code" in T && typeof T.code === "number") return T.code;
  if ("error" in T) {
    let R = iw(T.error);
    if (R !== void 0) return R;
  }
  if ("message" in T && typeof T.message === "string") return iw(T.message);
  return;
}