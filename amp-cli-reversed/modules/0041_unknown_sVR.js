function sVR(T, R = 0) {
  let a = Number.parseInt(new bs(6).get(T, 148).replace(/\0.*$/, "").trim(), 8);
  if (Number.isNaN(a)) return !1;
  let e = 256;
  for (let t = R; t < R + 148; t++) e += T[t];
  for (let t = R + 156; t < R + 512; t++) e += T[t];
  return a === e;
}