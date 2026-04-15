function em0(T, R) {
  if (!R) return;
  let a = HVT(T),
    e = Xb0(R.algorithm);
  e.update(a);
  let t = e.digest("hex");
  if (t !== R.hash) throw Error(`Checksum verification failed for ${T}
Expected: ${R.hash}
Actual:   ${t}`);
}