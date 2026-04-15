function zb0(T, R) {
  let a = Mb0(T),
    e = Cb0("sha256");
  e.update(a);
  let t = e.digest("hex");
  if (t !== R) throw Error(`Checksum verification failed for ${T}
Expected: ${R}
Actual:   ${t}`);
}