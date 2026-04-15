function T1(T, R) {
  if (Hr) ze(un(R), $i);
  let a = R >>> 0;
  while (a >= 128) dR(T, 128 | a & 127), a >>>= 7;
  dR(T, a);
}
function M8(T) {
  let R = s3(T);
  if (R >= 128) {
    R &= 127;
    let a = 128,
      e = 1,
      t;
    do t = s3(T), R += (t & 127) * a, a *= 128, e++; while (t >= 128 && e < Aw);
    if (t === 0) throw T.offset -= e - 1, new I0(T.offset - e + 1, zaT);
    if (e === Aw && t > 15) throw T.offset -= e - 1, new I0(T.offset, $i);
  }
  return R;
}