function Bt0(T) {
  if (!(T && Dt0(T) && T.name === "TypeError" && typeof T.message === "string")) return !1;
  let {
    message: R,
    stack: a
  } = T;
  if (R === "Load failed") return a === void 0 || "__sentry_captured__" in T;
  if (R.startsWith("error sending request for url")) return !0;
  if (R === "Failed to fetch" || R.startsWith("Failed to fetch (") && R.endsWith(")")) return !0;
  return wt0.has(R);
}