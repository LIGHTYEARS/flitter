function xjR(T) {
  let R = {},
    a = H(T, ["promptTokenCount"]);
  if (a != null) Y(R, ["promptTokenCount"], a);
  let e = H(T, ["cachedContentTokenCount"]);
  if (e != null) Y(R, ["cachedContentTokenCount"], e);
  let t = H(T, ["candidatesTokenCount"]);
  if (t != null) Y(R, ["responseTokenCount"], t);
  let r = H(T, ["toolUsePromptTokenCount"]);
  if (r != null) Y(R, ["toolUsePromptTokenCount"], r);
  let h = H(T, ["thoughtsTokenCount"]);
  if (h != null) Y(R, ["thoughtsTokenCount"], h);
  let i = H(T, ["totalTokenCount"]);
  if (i != null) Y(R, ["totalTokenCount"], i);
  let c = H(T, ["promptTokensDetails"]);
  if (c != null) {
    let n = c;
    if (Array.isArray(n)) n = n.map(p => {
      return p;
    });
    Y(R, ["promptTokensDetails"], n);
  }
  let s = H(T, ["cacheTokensDetails"]);
  if (s != null) {
    let n = s;
    if (Array.isArray(n)) n = n.map(p => {
      return p;
    });
    Y(R, ["cacheTokensDetails"], n);
  }
  let A = H(T, ["candidatesTokensDetails"]);
  if (A != null) {
    let n = A;
    if (Array.isArray(n)) n = n.map(p => {
      return p;
    });
    Y(R, ["responseTokensDetails"], n);
  }
  let l = H(T, ["toolUsePromptTokensDetails"]);
  if (l != null) {
    let n = l;
    if (Array.isArray(n)) n = n.map(p => {
      return p;
    });
    Y(R, ["toolUsePromptTokensDetails"], n);
  }
  let o = H(T, ["trafficType"]);
  if (o != null) Y(R, ["trafficType"], o);
  return R;
}