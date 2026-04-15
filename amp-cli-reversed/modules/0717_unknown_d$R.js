function S$R(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], wx(T, e));
  return a;
}
function O$R(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], wx(T, e));
  return a;
}
function d$R(T) {
  let R = {},
    a = H(T, ["content"]);
  if (a != null) Y(R, ["content"], a);
  let e = H(T, ["citationMetadata"]);
  if (e != null) Y(R, ["citationMetadata"], E$R(e));
  let t = H(T, ["tokenCount"]);
  if (t != null) Y(R, ["tokenCount"], t);
  let r = H(T, ["finishReason"]);
  if (r != null) Y(R, ["finishReason"], r);
  let h = H(T, ["avgLogprobs"]);
  if (h != null) Y(R, ["avgLogprobs"], h);
  let i = H(T, ["groundingMetadata"]);
  if (i != null) Y(R, ["groundingMetadata"], i);
  let c = H(T, ["index"]);
  if (c != null) Y(R, ["index"], c);
  let s = H(T, ["logprobsResult"]);
  if (s != null) Y(R, ["logprobsResult"], s);
  let A = H(T, ["safetyRatings"]);
  if (A != null) {
    let o = A;
    if (Array.isArray(o)) o = o.map(n => {
      return n;
    });
    Y(R, ["safetyRatings"], o);
  }
  let l = H(T, ["urlContextMetadata"]);
  if (l != null) Y(R, ["urlContextMetadata"], l);
  return R;
}