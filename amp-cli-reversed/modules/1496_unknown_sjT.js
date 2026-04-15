function cjT() {
  return new RegExp(WiR, "u");
}
function sjT(T) {
  return typeof T.precision === "number" ? T.precision === -1 ? "(?:[01]\\d|2[0-3]):[0-5]\\d" : T.precision === 0 ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d" : `(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${T.precision}}` : "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
}