function c6T(T, R) {
  let a = {},
    e = H(T, ["gcsUri"]);
  if (e != null) Y(a, ["gcsUri"], e);
  let t = H(T, ["bytesBase64Encoded"]);
  if (t != null) Y(a, ["imageBytes"], hp(t));
  let r = H(T, ["mimeType"]);
  if (r != null) Y(a, ["mimeType"], r);
  return a;
}