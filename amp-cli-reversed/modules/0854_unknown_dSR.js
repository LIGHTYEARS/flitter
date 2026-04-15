function dSR(T, R) {
  let a = {},
    e = H(T, ["bytesBase64Encoded"]);
  if (e != null) Y(a, ["imageBytes"], hp(e));
  let t = H(T, ["mimeType"]);
  if (t != null) Y(a, ["mimeType"], t);
  return a;
}