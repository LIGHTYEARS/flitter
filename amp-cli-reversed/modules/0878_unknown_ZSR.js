function ZSR(T, R) {
  let a = {},
    e = H(T, ["retrievalConfig"]);
  if (e != null) Y(a, ["retrievalConfig"], e);
  let t = H(T, ["functionCallingConfig"]);
  if (t != null) Y(a, ["functionCallingConfig"], TSR(t));
  return a;
}