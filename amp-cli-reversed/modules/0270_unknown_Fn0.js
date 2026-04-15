function XeT() {
  return globalThis;
}
function dKT(T) {
  if (!T || typeof T !== "object") return null;
  let R = T;
  if (typeof R.addEventListener !== "function" || typeof R.removeEventListener !== "function") return null;
  return R;
}
function PkT() {
  return dKT(XeT().window);
}
function tF() {
  let T = XeT().document;
  if (!dKT(T)) return null;
  return T;
}
function zn0() {
  let T = XeT().navigator;
  if (!T || typeof T !== "object") return null;
  return T;
}
function Fn0(T) {
  if (!T) return "none";
  let R = [T.type];
  if (T.code !== void 0) R.push(`code=${T.code}`);
  if (T.reason !== void 0) R.push(`reason=${T.reason}`);
  if (T.error !== void 0) R.push(`error=${T.error}`);
  return R.join(" ");
}