function kw0(T) {
  if (this.options.removeNSPrefix) {
    let R = T.split(":"),
      a = T.charAt(0) === "/" ? "/" : "";
    if (R[0] === "xmlns") return "";
    if (R.length === 2) T = a + R[1];
  }
  return T;
}