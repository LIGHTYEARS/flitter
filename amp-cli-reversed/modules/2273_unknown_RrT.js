function Yg0(T) {
  return T.replace(zg0, Qg0);
}
function Qg0(T) {
  return T.charAt(1).toUpperCase();
}
function Zg0(T) {
  return T === "`" ? "` ` `" : T;
}
function Jg0(T) {
  return "0x" + T.toString(16).toUpperCase();
}
function RrT(T, R) {
  let a = R || T$0,
    e = typeof a.includeImageAlt === "boolean" ? a.includeImageAlt : !0,
    t = typeof a.includeHtml === "boolean" ? a.includeHtml : !0;
  return HYT(T, e, t);
}