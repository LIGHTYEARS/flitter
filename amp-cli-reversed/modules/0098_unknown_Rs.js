function J1R(T) {
  if (T) return T;
  if (ZX) return ZX;
  let R = (U1R() || "warn").toString().toLowerCase(),
    a = WaT.safeParse(R);
  if (a.success) return a.data;
  return "info";
}
function TYR() {
  return H1R();
}
function Rs(T, R) {
  let a = {};
  if (YX() && R.time) {
    let t = typeof R.time === "number" ? new Date(R.time) : new Date();
    a.ts = Y1R(t);
  }
  if (a.level = T.toUpperCase(), R.target) a.target = R.target;
  if (R.msg) a.msg = R.msg;
  for (let [t, r] of Object.entries(R)) if (t !== "time" && t !== "level" && t !== "target" && t !== "msg" && t !== "pid" && t !== "hostname") a[t] = Q1R(r);
  let e = X1R(a);
  console.log(e);
}