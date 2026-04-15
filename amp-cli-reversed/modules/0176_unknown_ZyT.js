function ZyT(T, R, a) {
  if (T.isUnsubscribed) return !0;
  if (R.ignoreSymbols && bw(a)) return !0;
  if (R.ignoreUnderscores && typeof a === "string" && a.charAt(0) === "_") return !0;
  let e = R.ignoreKeys;
  if (e) return Array.isArray(e) ? e.includes(a) : e instanceof Set ? e.has(a) : !1;
  return !1;
}