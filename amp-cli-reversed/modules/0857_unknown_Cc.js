function Cc(T, R) {
  let a = {},
    e = H(T, ["gcsUri"]);
  if (e != null) Y(a, ["gcsUri"], e);
  let t = H(T, ["imageBytes"]);
  if (t != null) Y(a, ["bytesBase64Encoded"], hp(t));
  let r = H(T, ["mimeType"]);
  if (r != null) Y(a, ["mimeType"], r);
  return a;
}