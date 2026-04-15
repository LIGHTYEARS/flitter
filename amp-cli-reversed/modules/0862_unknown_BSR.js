function BSR(T, R) {
  let a = {},
    e = H(T, ["maskMode"]);
  if (e != null) Y(a, ["maskMode"], e);
  let t = H(T, ["segmentationClasses"]);
  if (t != null) Y(a, ["maskClasses"], t);
  let r = H(T, ["maskDilation"]);
  if (r != null) Y(a, ["dilation"], r);
  return a;
}