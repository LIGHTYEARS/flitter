function p$R(T) {
  let R = {},
    a = H(T, ["gcsUri"]);
  if (a != null) Y(R, ["uri"], a);
  let e = H(T, ["bytesBase64Encoded"]);
  if (e != null) Y(R, ["videoBytes"], w8T(e));
  let t = H(T, ["mimeType"]);
  if (t != null) Y(R, ["mimeType"], t);
  return R;
}