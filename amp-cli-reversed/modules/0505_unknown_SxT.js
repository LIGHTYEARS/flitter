function Iu0(T) {
  return ru0 + (T ? iu0 : "");
}
function gu0() {
  return hu0 + cu0;
}
function JVT(T) {
  return uu0(T);
}
function $u0() {
  return ZVT;
}
function SxT(T, R, a) {
  if (!T) return "";
  switch (T.type) {
    case "none":
      return "";
    case "default":
      return t9 + (R ? "39" : "49") + "m";
    case "index":
      return t9 + `${R ? "38" : "48"};5;${T.value}m`;
    case "rgb":
      {
        if (a && !a.canRgb) {
          let {
              r: i,
              g: c,
              b: s
            } = T.value,
            A = PtT(i, c, s);
          return t9 + `${R ? "38" : "48"};5;${A}m`;
        }
        let e = R ? "38" : "48",
          {
            r: t,
            g: r,
            b: h
          } = T.value;
        return t9 + `${e};2;${t};${r};${h}m`;
      }
    default:
      return "";
  }
}