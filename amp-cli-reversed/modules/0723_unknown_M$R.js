function M$R(T, R) {
  let a = {},
    e = H(R, ["model"]);
  if (e != null) Y(a, ["model"], g8(T, e));
  let t = H(R, ["src"]);
  if (t != null) Y(a, ["inputConfig"], v$R(R6T(T, t)));
  let r = H(R, ["config"]);
  if (r != null) L$R(r, a);
  return a;
}