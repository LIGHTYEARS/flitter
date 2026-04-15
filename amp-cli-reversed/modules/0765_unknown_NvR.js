function NvR(T) {
  let R = {},
    a = H(T, ["retrieval"]);
  if (a != null) Y(R, ["retrieval"], a);
  let e = H(T, ["computerUse"]);
  if (e != null) Y(R, ["computerUse"], e);
  if (H(T, ["fileSearch"]) !== void 0) throw Error("fileSearch parameter is not supported in Vertex AI.");
  let t = H(T, ["codeExecution"]);
  if (t != null) Y(R, ["codeExecution"], t);
  let r = H(T, ["enterpriseWebSearch"]);
  if (r != null) Y(R, ["enterpriseWebSearch"], r);
  let h = H(T, ["functionDeclarations"]);
  if (h != null) {
    let l = h;
    if (Array.isArray(l)) l = l.map(o => {
      return gvR(o);
    });
    Y(R, ["functionDeclarations"], l);
  }
  let i = H(T, ["googleMaps"]);
  if (i != null) Y(R, ["googleMaps"], i);
  let c = H(T, ["googleSearch"]);
  if (c != null) Y(R, ["googleSearch"], c);
  let s = H(T, ["googleSearchRetrieval"]);
  if (s != null) Y(R, ["googleSearchRetrieval"], s);
  let A = H(T, ["urlContext"]);
  if (A != null) Y(R, ["urlContext"], A);
  return R;
}