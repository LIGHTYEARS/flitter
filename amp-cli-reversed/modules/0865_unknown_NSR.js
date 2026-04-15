function NSR(T, R) {
  let a = {},
    e = H(T, ["mediaResolution"]);
  if (e != null) Y(a, ["mediaResolution"], e);
  let t = H(T, ["codeExecutionResult"]);
  if (t != null) Y(a, ["codeExecutionResult"], t);
  let r = H(T, ["executableCode"]);
  if (r != null) Y(a, ["executableCode"], r);
  let h = H(T, ["fileData"]);
  if (h != null) Y(a, ["fileData"], ZjR(h));
  let i = H(T, ["functionCall"]);
  if (i != null) Y(a, ["functionCall"], JjR(i));
  let c = H(T, ["functionResponse"]);
  if (c != null) Y(a, ["functionResponse"], c);
  let s = H(T, ["inlineData"]);
  if (s != null) Y(a, ["inlineData"], IjR(s));
  let A = H(T, ["text"]);
  if (A != null) Y(a, ["text"], A);
  let l = H(T, ["thought"]);
  if (l != null) Y(a, ["thought"], l);
  let o = H(T, ["thoughtSignature"]);
  if (o != null) Y(a, ["thoughtSignature"], o);
  let n = H(T, ["videoMetadata"]);
  if (n != null) Y(a, ["videoMetadata"], n);
  return a;
}