function c4T(T) {
  if (typeof T !== "string") throw Error("arg is not a string");
  if (T.startsWith("-")) throw Error("arg is not safe");
}
function uN(T) {
  if (!T) throw Error("tool requires a working directory");
  if (T.scheme !== "file") throw Error(`tool requires a dir with a file: URI (got ${JSON.stringify(T.scheme)})`);
}
function Cj(T, R) {
  if (R === "") return !1;
  let a = T.toLowerCase(),
    e = R.toLowerCase();
  if (e.length === 1) {
    if (e === "*") return !0;
    return e === a;
  }
  if (a === e) return !0;
  if (e.includes("*") || e.includes("?") || e.includes("[") || e.includes("{")) try {
    return s4T.default(e, {
      dot: !0
    })(a);
  } catch (t) {
    return !1;
  }
  return !1;
}