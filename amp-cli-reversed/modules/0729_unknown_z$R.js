function z$R(T, R) {
  let a = {},
    e = H(R, ["fileName"]);
  if (e != null) Y(a, ["file_name"], e);
  let t = H(R, ["inlinedRequests"]);
  if (t != null) Y(a, ["requests"], W$R(T, t));
  return a;
}