function lvR(T) {
  let R = {};
  if (H(T, ["retrieval"]) !== void 0) throw Error("retrieval parameter is not supported in Gemini API.");
  let a = H(T, ["computerUse"]);
  if (a != null) Y(R, ["computerUse"], a);
  let e = H(T, ["fileSearch"]);
  if (e != null) Y(R, ["fileSearch"], e);
  let t = H(T, ["codeExecution"]);
  if (t != null) Y(R, ["codeExecution"], t);
  if (H(T, ["enterpriseWebSearch"]) !== void 0) throw Error("enterpriseWebSearch parameter is not supported in Gemini API.");
  let r = H(T, ["functionDeclarations"]);
  if (r != null) {
    let A = r;
    if (Array.isArray(A)) A = A.map(l => {
      return l;
    });
    Y(R, ["functionDeclarations"], A);
  }
  let h = H(T, ["googleMaps"]);
  if (h != null) Y(R, ["googleMaps"], Z$R(h));
  let i = H(T, ["googleSearch"]);
  if (i != null) Y(R, ["googleSearch"], J$R(i));
  let c = H(T, ["googleSearchRetrieval"]);
  if (c != null) Y(R, ["googleSearchRetrieval"], c);
  let s = H(T, ["urlContext"]);
  if (s != null) Y(R, ["urlContext"], s);
  return R;
}