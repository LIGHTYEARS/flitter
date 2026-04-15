function qAT(T, R) {
  let a = {},
    e = H(R, ["model"]);
  if (e != null) Y(a, ["_url", "model"], g8(T, e));
  let t = H(R, ["src"]);
  if (t != null) Y(a, ["batch", "inputConfig"], $$R(T, R6T(T, t)));
  let r = H(R, ["config"]);
  if (r != null) C$R(r, a);
  return a;
}