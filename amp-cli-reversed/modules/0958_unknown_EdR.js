function EdR(T, R) {
  let a = {},
    e = H(T, ["baseModel"]);
  if (e != null) Y(a, ["baseModel"], e);
  let t = H(T, ["preTunedModel"]);
  if (t != null) Y(a, ["preTunedModel"], t);
  let r = H(T, ["trainingDataset"]);
  if (r != null) qdR(r, a, R);
  let h = H(T, ["config"]);
  if (h != null) OdR(h, a, R);
  return a;
}