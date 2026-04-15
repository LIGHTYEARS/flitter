function xNT(T, R) {
  if (!T || typeof T !== "object" || Array.isArray(T)) return T;
  return Object.defineProperty(T, "_request_id", {
    value: R.headers.get("x-request-id"),
    enumerable: !1
  });
}