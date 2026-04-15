function JnR(T, R, a) {
  let e;
  if (T) e = uiT(T.random ?? T.rng?.() ?? miT(), T.msecs, T.seq, R, a);else {
    let t = Date.now(),
      r = miT();
    TlR(pL, t, r), e = uiT(r, pL.msecs, pL.seq, R, a);
  }
  return R ?? QnR(e);
}