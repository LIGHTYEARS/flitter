function SFT(T) {
  let R = s3(T);
  if (R >= 128) {
    R &= 127;
    let a = 7,
      e = 1,
      t;
    do t = s3(T), R += (t & 127) << a >>> 0, a += 7, e++; while (t >= 128 && e < yyT);
    if (t === 0) throw T.offset -= e - 1, new I0(T.offset - e + 1, zaT);
    if (e === yyT && t > 15) throw T.offset -= e - 1, new I0(T.offset, $i);
  }
  return R;
}