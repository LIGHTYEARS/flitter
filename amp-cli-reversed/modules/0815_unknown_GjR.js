function GjR(T, R, a) {
  let e = {},
    t = H(T, ["taskType"]);
  if (R !== void 0 && t != null) Y(R, ["instances[]", "task_type"], t);
  let r = H(T, ["title"]);
  if (R !== void 0 && r != null) Y(R, ["instances[]", "title"], r);
  let h = H(T, ["outputDimensionality"]);
  if (R !== void 0 && h != null) Y(R, ["parameters", "outputDimensionality"], h);
  let i = H(T, ["mimeType"]);
  if (R !== void 0 && i != null) Y(R, ["instances[]", "mimeType"], i);
  let c = H(T, ["autoTruncate"]);
  if (R !== void 0 && c != null) Y(R, ["parameters", "autoTruncate"], c);
  return e;
}