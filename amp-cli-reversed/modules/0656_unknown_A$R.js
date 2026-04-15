function A$R(T) {
  let R = {},
    a = H(T, ["uri"]);
  if (a != null) Y(R, ["uri"], a);
  let e = H(T, ["encodedVideo"]);
  if (e != null) Y(R, ["videoBytes"], w8T(e));
  let t = H(T, ["encoding"]);
  if (t != null) Y(R, ["mimeType"], t);
  return R;
}