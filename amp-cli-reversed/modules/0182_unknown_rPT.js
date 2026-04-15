function rPT(T) {
  if (typeof Buffer < "u") return Buffer.from(T).toString("base64");
  let R = "",
    a = T.byteLength;
  for (let e = 0; e < a; e++) R += String.fromCharCode(T[e]);
  return btoa(R);
}