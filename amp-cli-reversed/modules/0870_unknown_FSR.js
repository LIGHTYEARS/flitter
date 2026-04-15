function FSR(T, R) {
  let a = {},
    e = H(T, ["referenceImage"]);
  if (e != null) Y(a, ["referenceImage"], Cc(e));
  let t = H(T, ["referenceId"]);
  if (t != null) Y(a, ["referenceId"], t);
  let r = H(T, ["referenceType"]);
  if (r != null) Y(a, ["referenceType"], r);
  let h = H(T, ["maskImageConfig"]);
  if (h != null) Y(a, ["maskImageConfig"], BSR(h));
  let i = H(T, ["controlImageConfig"]);
  if (i != null) Y(a, ["controlImageConfig"], djR(i));
  let c = H(T, ["styleImageConfig"]);
  if (c != null) Y(a, ["styleImageConfig"], c);
  let s = H(T, ["subjectImageConfig"]);
  if (s != null) Y(a, ["subjectImageConfig"], s);
  return a;
}