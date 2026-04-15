function RSR(T, R) {
  let a = {},
    e = H(T, ["description"]);
  if (e != null) Y(a, ["description"], e);
  let t = H(T, ["name"]);
  if (t != null) Y(a, ["name"], t);
  let r = H(T, ["parameters"]);
  if (r != null) Y(a, ["parameters"], r);
  let h = H(T, ["parametersJsonSchema"]);
  if (h != null) Y(a, ["parametersJsonSchema"], h);
  let i = H(T, ["response"]);
  if (i != null) Y(a, ["response"], i);
  let c = H(T, ["responseJsonSchema"]);
  if (c != null) Y(a, ["responseJsonSchema"], c);
  if (H(T, ["behavior"]) !== void 0) throw Error("behavior parameter is not supported in Vertex AI.");
  return a;
}