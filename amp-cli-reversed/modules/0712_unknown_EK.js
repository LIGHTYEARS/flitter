function EK(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["name"], a);
  let e = H(T, ["displayName"]);
  if (e != null) Y(R, ["displayName"], e);
  let t = H(T, ["state"]);
  if (t != null) Y(R, ["state"], e6T(t));
  let r = H(T, ["error"]);
  if (r != null) Y(R, ["error"], r);
  let h = H(T, ["createTime"]);
  if (h != null) Y(R, ["createTime"], h);
  let i = H(T, ["startTime"]);
  if (i != null) Y(R, ["startTime"], i);
  let c = H(T, ["endTime"]);
  if (c != null) Y(R, ["endTime"], c);
  let s = H(T, ["updateTime"]);
  if (s != null) Y(R, ["updateTime"], s);
  let A = H(T, ["model"]);
  if (A != null) Y(R, ["model"], A);
  let l = H(T, ["inputConfig"]);
  if (l != null) Y(R, ["src"], g$R(l));
  let o = H(T, ["outputConfig"]);
  if (o != null) Y(R, ["dest"], f$R(a6T(o)));
  let n = H(T, ["completionStats"]);
  if (n != null) Y(R, ["completionStats"], n);
  return R;
}