function O6T(T, R) {
  let a = {},
    e = H(T, ["sdkHttpResponse"]);
  if (e != null) Y(a, ["sdkHttpResponse"], e);
  let t = H(T, ["name"]);
  if (t != null) Y(a, ["name"], t);
  let r = H(T, ["state"]);
  if (r != null) Y(a, ["state"], YBT(r));
  let h = H(T, ["createTime"]);
  if (h != null) Y(a, ["createTime"], h);
  let i = H(T, ["tuningTask", "startTime"]);
  if (i != null) Y(a, ["startTime"], i);
  let c = H(T, ["tuningTask", "completeTime"]);
  if (c != null) Y(a, ["endTime"], c);
  let s = H(T, ["updateTime"]);
  if (s != null) Y(a, ["updateTime"], s);
  let A = H(T, ["description"]);
  if (A != null) Y(a, ["description"], A);
  let l = H(T, ["baseModel"]);
  if (l != null) Y(a, ["baseModel"], l);
  let o = H(T, ["_self"]);
  if (o != null) Y(a, ["tunedModel"], HdR(o));
  return a;
}