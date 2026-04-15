function rD(...T) {
  let [R, a, e] = T;
  if (typeof R === "string") return {
    message: R,
    code: "custom",
    input: a,
    inst: e
  };
  return {
    ...R
  };
}
function DiR(T) {
  return Object.entries(T).filter(([R, a]) => {
    return Number.isNaN(Number.parseInt(R, 10));
  }).map(R => R[1]);
}
function GvT(T) {
  let R = atob(T),
    a = new Uint8Array(R.length);
  for (let e = 0; e < R.length; e++) a[e] = R.charCodeAt(e);
  return a;
}
function KvT(T) {
  let R = "";
  for (let a = 0; a < T.length; a++) R += String.fromCharCode(T[a]);
  return btoa(R);
}
function wiR(T) {
  let R = T.replace(/-/g, "+").replace(/_/g, "/"),
    a = "=".repeat((4 - R.length % 4) % 4);
  return GvT(R + a);
}
function BiR(T) {
  return KvT(T).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function NiR(T) {
  let R = T.replace(/^0x/, "");
  if (R.length % 2 !== 0) throw Error("Invalid hex string length");
  let a = new Uint8Array(R.length / 2);
  for (let e = 0; e < R.length; e += 2) a[e / 2] = Number.parseInt(R.slice(e, e + 2), 16);
  return a;
}