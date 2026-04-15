function SjR(T, R) {
  let a = {},
    e = H(T, ["values"]);
  if (e != null) Y(a, ["values"], e);
  let t = H(T, ["statistics"]);
  if (t != null) Y(a, ["statistics"], OjR(t));
  return a;
}
function OjR(T, R) {
  let a = {},
    e = H(T, ["truncated"]);
  if (e != null) Y(a, ["truncated"], e);
  let t = H(T, ["token_count"]);
  if (t != null) Y(a, ["tokenCount"], t);
  return a;
}
function hU(T, R) {
  let a = {},
    e = H(T, ["parts"]);
  if (e != null) {
    let r = e;
    if (Array.isArray(r)) r = r.map(h => {
      return NSR(h);
    });
    Y(a, ["parts"], r);
  }
  let t = H(T, ["role"]);
  if (t != null) Y(a, ["role"], t);
  return a;
}