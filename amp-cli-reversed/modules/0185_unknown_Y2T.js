function X2T(T) {
  let R = "",
    a = T.byteLength;
  for (let e = 0; e < a; e++) R += String.fromCharCode(T[e]);
  return btoa(R);
}
function E90(T) {
  let R = new Uint8Array(T);
  return X2T(R);
}
function Y2T(T) {
  if (typeof Buffer < "u") return new Uint8Array(Buffer.from(T, "base64"));
  let R = atob(T),
    a = R.length,
    e = new Uint8Array(a);
  for (let t = 0; t < a; t++) e[t] = R.charCodeAt(t);
  return e;
}