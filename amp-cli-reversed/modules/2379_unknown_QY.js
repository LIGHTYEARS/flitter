function aS0(T) {
  throw Error("Cannot handle value `" + T + "`, expected node");
}
function eS0(T) {
  throw Error("Cannot handle unknown node `" + T.type + "`");
}
function tS0(T, R) {
  if (T.type === "definition" && T.type === R.type) return 0;
}
function rS0(T, R) {
  return Kj0(T, this, R);
}
function hS0(T, R) {
  return Vj0(T, this, R);
}
function iS0(T, R) {
  return Zj0(this, T, R);
}
function cS0(T) {
  let R = this;
  R.compiler = a;
  function a(e) {
    return RS0(e, {
      ...R.data("settings"),
      ...T,
      extensions: R.data("toMarkdownExtensions") || []
    });
  }
}
function XfT(T) {
  if (T) throw T;
}
function QY(T) {
  if (typeof T !== "object" || T === null) return !1;
  let R = Object.getPrototypeOf(T);
  return (R === null || R === Object.prototype || Object.getPrototypeOf(R) === null) && !(Symbol.toStringTag in T) && !(Symbol.iterator in T);
}