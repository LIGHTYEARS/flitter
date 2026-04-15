function n6T(T, R) {
  let a = {},
    e = H(T, ["retrieval"]);
  if (e != null) Y(a, ["retrieval"], e);
  let t = H(T, ["computerUse"]);
  if (t != null) Y(a, ["computerUse"], t);
  if (H(T, ["fileSearch"]) !== void 0) throw Error("fileSearch parameter is not supported in Vertex AI.");
  let r = H(T, ["codeExecution"]);
  if (r != null) Y(a, ["codeExecution"], r);
  let h = H(T, ["enterpriseWebSearch"]);
  if (h != null) Y(a, ["enterpriseWebSearch"], h);
  let i = H(T, ["functionDeclarations"]);
  if (i != null) {
    let o = i;
    if (Array.isArray(o)) o = o.map(n => {
      return RSR(n);
    });
    Y(a, ["functionDeclarations"], o);
  }
  let c = H(T, ["googleMaps"]);
  if (c != null) Y(a, ["googleMaps"], c);
  let s = H(T, ["googleSearch"]);
  if (s != null) Y(a, ["googleSearch"], s);
  let A = H(T, ["googleSearchRetrieval"]);
  if (A != null) Y(a, ["googleSearchRetrieval"], A);
  let l = H(T, ["urlContext"]);
  if (l != null) Y(a, ["urlContext"], l);
  return a;
}