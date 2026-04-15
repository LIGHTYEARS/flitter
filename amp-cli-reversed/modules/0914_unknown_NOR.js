function NOR(T) {
  let R = {},
    a = H(T, ["parts"]);
  if (a != null) {
    let t = a;
    if (Array.isArray(t)) t = t.map(r => {
      return VOR(r);
    });
    Y(R, ["parts"], t);
  }
  let e = H(T, ["role"]);
  if (e != null) Y(R, ["role"], e);
  return R;
}