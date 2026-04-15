function A6T(T, R) {
  let a = {},
    e = H(T, ["uri"]);
  if (e != null) Y(a, ["gcsUri"], e);
  let t = H(T, ["videoBytes"]);
  if (t != null) Y(a, ["bytesBase64Encoded"], hp(t));
  let r = H(T, ["mimeType"]);
  if (r != null) Y(a, ["mimeType"], r);
  return a;
}