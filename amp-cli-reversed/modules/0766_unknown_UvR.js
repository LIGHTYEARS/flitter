function UvR(T, R) {
  let a = {},
    e = H(T, ["ttl"]);
  if (R !== void 0 && e != null) Y(R, ["ttl"], e);
  let t = H(T, ["expireTime"]);
  if (R !== void 0 && t != null) Y(R, ["expireTime"], t);
  return a;
}