function TOR(T, R) {
  let a = {},
    e = H(T, ["baseModel"]);
  if (e != null) Y(a, ["baseModel"], e);
  let t = H(T, ["createTime"]);
  if (t != null) Y(a, ["createTime"], t);
  let r = H(T, ["updateTime"]);
  if (r != null) Y(a, ["updateTime"], r);
  return a;
}