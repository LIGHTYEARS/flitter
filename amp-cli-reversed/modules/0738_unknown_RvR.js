function RvR(T, R) {
  let a = {},
    e = H(R, ["model"]);
  if (e != null) Y(a, ["request", "model"], g8(T, e));
  let t = H(R, ["contents"]);
  if (t != null) {
    let i = ui(t);
    if (Array.isArray(i)) i = i.map(c => {
      return t6T(c);
    });
    Y(a, ["request", "contents"], i);
  }
  let r = H(R, ["metadata"]);
  if (r != null) Y(a, ["metadata"], r);
  let h = H(R, ["config"]);
  if (h != null) Y(a, ["request", "generationConfig"], V$R(T, h, H(a, ["request"], {})));
  return a;
}