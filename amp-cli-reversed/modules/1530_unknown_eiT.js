function TnR(T) {
  return ZjT(_x, T);
}
function RnR(T) {
  return rST(hk, T);
}
function anR(T) {
  return lST(bx, T);
}
function enR(T) {
  return pST(ik, T);
}
function tnR(T) {
  return gST(HS, T);
}
function hnR() {
  if (typeof process === "object") return "posix";else if (typeof navigator === "object") return navigator.userAgent.indexOf("Windows") >= 0 ? "windows" : "posix";
  return "posix";
}
function eiT(T, R) {
  if (!T.scheme && R) throw Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${T.authority}", path: "${T.path}", query: "${T.query}", fragment: "${T.fragment}"}`);
  if (T.scheme && !HdT.test(T.scheme)) throw Error("[UriError]: Scheme contains illegal characters.");
  if (T.path) {
    if (T.authority) {
      if (!WdT.test(T.path)) throw Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
    } else if (qdT.test(T.path)) throw Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
  }
}