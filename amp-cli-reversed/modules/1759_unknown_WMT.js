function ilT(T) {
  return {
    type: T.type,
    message: T.message,
    code: T.code,
    defaultPrevented: T.defaultPrevented,
    cancelable: T.cancelable,
    timeStamp: T.timeStamp
  };
}
function eyR() {
  let T = "document" in globalThis ? globalThis.document : void 0;
  return T && typeof T == "object" && "baseURI" in T && typeof T.baseURI == "string" ? T.baseURI : void 0;
}
function QD(T) {
  if (!T) return {};
  if (T instanceof Headers) return Object.fromEntries(T.entries());
  if (Array.isArray(T)) return Object.fromEntries(T);
  return {
    ...T
  };
}
function WMT(T = fetch, R) {
  if (!R) return T;
  return async (a, e) => {
    let t = {
      ...R,
      ...e,
      headers: e?.headers ? {
        ...QD(R.headers),
        ...QD(e.headers)
      } : R.headers
    };
    return T(a, t);
  };
}