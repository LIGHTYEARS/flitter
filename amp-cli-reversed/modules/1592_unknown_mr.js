function MlR(T) {
  return T.trim().replace(CET, "");
}
function DlR(T) {
  let R = T.split("/").filter(Boolean);
  for (let a = R.length - 1; a >= 0; a--) {
    let e = R[a];
    if (e && Vt(e)) return e;
  }
  return null;
}
function mr(T) {
  let R = MlR(T);
  if (!R) return null;
  if (Vt(R)) return R;
  let a;
  try {
    a = new URL(R);
  } catch {
    return null;
  }
  if (!znR(a)) return null;
  return DlR(a.pathname);
}