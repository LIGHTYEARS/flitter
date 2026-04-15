function PYR(T) {
  let R = T.length;
  for (let a = 0; a < T.length; a++) {
    let e = T.codePointAt(a);
    if (e > 127) {
      if (R++, e > 2047) {
        if (R++, e > 65535) a++;
      }
    }
  }
  return R;
}