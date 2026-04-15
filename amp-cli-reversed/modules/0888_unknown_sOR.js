function sOR(T, R) {
  let a = {},
    e = H(T, ["uri"]);
  if (e != null) Y(a, ["uri"], e);
  let t = H(T, ["encodedVideo"]);
  if (t != null) Y(a, ["videoBytes"], hp(t));
  let r = H(T, ["encoding"]);
  if (r != null) Y(a, ["mimeType"], r);
  return a;
}