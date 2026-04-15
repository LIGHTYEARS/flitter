function rjR(T) {
  let R = {},
    a = H(T, ["description"]);
  if (a != null) Y(R, ["description"], a);
  let e = H(T, ["name"]);
  if (e != null) Y(R, ["name"], e);
  let t = H(T, ["parameters"]);
  if (t != null) Y(R, ["parameters"], t);
  let r = H(T, ["parametersJsonSchema"]);
  if (r != null) Y(R, ["parametersJsonSchema"], r);
  let h = H(T, ["response"]);
  if (h != null) Y(R, ["response"], h);
  let i = H(T, ["responseJsonSchema"]);
  if (i != null) Y(R, ["responseJsonSchema"], i);
  if (H(T, ["behavior"]) !== void 0) throw Error("behavior parameter is not supported in Vertex AI.");
  return R;
}