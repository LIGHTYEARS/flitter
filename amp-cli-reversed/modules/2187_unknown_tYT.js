function J1T(T, R) {
  return R in T ? T[R] : R;
}
function TYT(T, R) {
  return J1T(T, R.toLowerCase());
}
function tYT(T, R) {
  let a = PS(R),
    e = R,
    t = Tr;
  if (a in T.normal) return T.property[T.normal[a]];
  if (a.length > 4 && a.slice(0, 4) === "data" && Yx0.test(R)) {
    if (R.charAt(4) === "-") {
      let r = R.slice(5).replace(nfT, Zx0);
      e = "data" + r.charAt(0).toUpperCase() + r.slice(1);
    } else {
      let r = R.slice(4);
      if (!nfT.test(r)) {
        let h = r.replace(Xx0, Qx0);
        if (h.charAt(0) !== "-") h = "-" + h;
        R = "data" + h;
      }
    }
    t = MH;
  }
  return new t(e, R);
}