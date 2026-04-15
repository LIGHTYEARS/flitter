function xN(T, R) {
  return T?.addEventListener("abort", R, {
    once: !0
  }), () => T?.removeEventListener("abort", R);
}
function xr(T) {
  if (T instanceof DOMException && T.name === "AbortError") return !0;
  if (T instanceof Error) {
    if (T.name === "AbortError") return !0;
    if ("status" in T && T.status === 499) return !0;
    if (/request was aborted|The operation was aborted|AbortError/i.test(T.message)) return !0;
    if (T?.cause && xr(T.cause)) return !0;
  }
  return !1;
}