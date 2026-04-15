function vKT(T) {
  for (let R of T) {
    let a = vn0(R);
    if (a) return a;
  }
  return null;
}
function jn0(T) {
  return T.some(R => {
    if (!R || typeof R !== "object") return !1;
    let a = R;
    return a.code === "invalid_union" && (a.note === "No matching discriminator" || a.discriminator === "type" || $KT(a.path) === "type");
  });
}