function ujR(T) {
  let R = {},
    a = H(T, ["mediaResolution"]);
  if (a != null) Y(R, ["mediaResolution"], a);
  let e = H(T, ["codeExecutionResult"]);
  if (e != null) Y(R, ["codeExecutionResult"], e);
  let t = H(T, ["executableCode"]);
  if (t != null) Y(R, ["executableCode"], t);
  let r = H(T, ["fileData"]);
  if (r != null) Y(R, ["fileData"], ejR(r));
  let h = H(T, ["functionCall"]);
  if (h != null) Y(R, ["functionCall"], tjR(h));
  let i = H(T, ["functionResponse"]);
  if (i != null) Y(R, ["functionResponse"], i);
  let c = H(T, ["inlineData"]);
  if (c != null) Y(R, ["inlineData"], qL(c));
  let s = H(T, ["text"]);
  if (s != null) Y(R, ["text"], s);
  let A = H(T, ["thought"]);
  if (A != null) Y(R, ["thought"], A);
  let l = H(T, ["thoughtSignature"]);
  if (l != null) Y(R, ["thoughtSignature"], l);
  let o = H(T, ["videoMetadata"]);
  if (o != null) Y(R, ["videoMetadata"], o);
  return R;
}