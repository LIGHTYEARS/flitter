function WF(T) {
  let R = 0,
    a = 0;
  while (!T.hasError()) {
    let e = T.nextByte();
    if (a = a | (e & 127) << 7 * R, (e & 128) === 0) break;
    if (R >= 10) {
      T.error = !0;
      break;
    }
    R++;
  }
  return a;
}