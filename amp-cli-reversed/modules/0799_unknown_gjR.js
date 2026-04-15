function gjR(T, R) {
  let a = {},
    e = H(T, ["content"]);
  if (e != null) Y(a, ["content"], e);
  let t = H(T, ["citationMetadata"]);
  if (t != null) Y(a, ["citationMetadata"], $jR(t));
  let r = H(T, ["tokenCount"]);
  if (r != null) Y(a, ["tokenCount"], r);
  let h = H(T, ["finishReason"]);
  if (h != null) Y(a, ["finishReason"], h);
  let i = H(T, ["avgLogprobs"]);
  if (i != null) Y(a, ["avgLogprobs"], i);
  let c = H(T, ["groundingMetadata"]);
  if (c != null) Y(a, ["groundingMetadata"], c);
  let s = H(T, ["index"]);
  if (s != null) Y(a, ["index"], s);
  let A = H(T, ["logprobsResult"]);
  if (A != null) Y(a, ["logprobsResult"], A);
  let l = H(T, ["safetyRatings"]);
  if (l != null) {
    let n = l;
    if (Array.isArray(n)) n = n.map(p => {
      return p;
    });
    Y(a, ["safetyRatings"], n);
  }
  let o = H(T, ["urlContextMetadata"]);
  if (o != null) Y(a, ["urlContextMetadata"], o);
  return a;
}