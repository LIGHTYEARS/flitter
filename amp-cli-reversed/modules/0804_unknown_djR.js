function djR(T, R) {
  let a = {},
    e = H(T, ["controlType"]);
  if (e != null) Y(a, ["controlType"], e);
  let t = H(T, ["enableControlImageComputation"]);
  if (t != null) Y(a, ["computeControl"], t);
  return a;
}