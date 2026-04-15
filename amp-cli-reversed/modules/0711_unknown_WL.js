function WL(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["name"], a);
  let e = H(T, ["metadata", "displayName"]);
  if (e != null) Y(R, ["displayName"], e);
  let t = H(T, ["metadata", "state"]);
  if (t != null) Y(R, ["state"], e6T(t));
  let r = H(T, ["metadata", "createTime"]);
  if (r != null) Y(R, ["createTime"], r);
  let h = H(T, ["metadata", "endTime"]);
  if (h != null) Y(R, ["endTime"], h);
  let i = H(T, ["metadata", "updateTime"]);
  if (i != null) Y(R, ["updateTime"], i);
  let c = H(T, ["metadata", "model"]);
  if (c != null) Y(R, ["model"], c);
  let s = H(T, ["metadata", "output"]);
  if (s != null) Y(R, ["dest"], x$R(a6T(s)));
  return R;
}