function UdT(T) {
  try {
    return decodeURIComponent(T);
  } catch {
    if (T.length > 3) return T.substring(0, 3) + UdT(T.substring(3));else return T;
  }
}
function _E(T) {
  if (!T.match(y2)) return T;
  return T.replace(y2, R => UdT(R));
}
function Pj(T) {
  return T.scheme === "file";
}
function Ht(T) {
  return zR.parse(T);
}
function d0(T) {
  return nn.parse(T.toString());
}
function I8(T) {
  if (typeof T === "string" || T instanceof URL) return zR.parse(T.toString());
  return T;
}
function onR(T) {
  if (T === "/") return "/";
  if (T === "") return ".";
  let R = T.replace(/\/+$/, "");
  if (!R) return ".";
  let a = R.lastIndexOf("/");
  if (a === -1) return ".";
  if (a === 0) return "/";
  return R.slice(0, a);
}