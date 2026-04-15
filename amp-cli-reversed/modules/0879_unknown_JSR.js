function JSR(T, R) {
  let a = {};
  if (H(T, ["retrieval"]) !== void 0) throw Error("retrieval parameter is not supported in Gemini API.");
  let e = H(T, ["computerUse"]);
  if (e != null) Y(a, ["computerUse"], e);
  let t = H(T, ["fileSearch"]);
  if (t != null) Y(a, ["fileSearch"], t);
  let r = H(T, ["codeExecution"]);
  if (r != null) Y(a, ["codeExecution"], r);
  if (H(T, ["enterpriseWebSearch"]) !== void 0) throw Error("enterpriseWebSearch parameter is not supported in Gemini API.");
  let h = H(T, ["functionDeclarations"]);
  if (h != null) {
    let l = h;
    if (Array.isArray(l)) l = l.map(o => {
      return o;
    });
    Y(a, ["functionDeclarations"], l);
  }
  let i = H(T, ["googleMaps"]);
  if (i != null) Y(a, ["googleMaps"], vSR(i));
  let c = H(T, ["googleSearch"]);
  if (c != null) Y(a, ["googleSearch"], jSR(c));
  let s = H(T, ["googleSearchRetrieval"]);
  if (s != null) Y(a, ["googleSearchRetrieval"], s);
  let A = H(T, ["urlContext"]);
  if (A != null) Y(a, ["urlContext"], A);
  return a;
}