function AYR(T) {
  return "maxByteLength" in T;
}
function q0(T) {
  let R = s3(T);
  if (R > 1) throw T.offset--, new I0(T.offset, "a bool must be equal to 0 or 1");
  return R > 0;
}
function z0(T, R) {
  dR(T, R ? 1 : 0);
}
function jA(T) {
  Um(T, 8);
  let R = T.view.getBigInt64(T.offset, !0);
  return T.offset += 8, R;
}
function SA(T, R) {
  if (Hr) ze(rYR(R), $i);
  Hm(T, 8), T.view.setBigInt64(T.offset, R, !0), T.offset += 8;
}
function s3(T) {
  return Um(T, 1), T.bytes[T.offset++];
}
function dR(T, R) {
  if (Hr) ze(hYR(R), $i);
  Hm(T, 1), T.bytes[T.offset++] = R;
}
function pw(T) {
  Um(T, 2);
  let R = T.view.getUint16(T.offset, !0);
  return T.offset += 2, R;
}
function _w(T, R) {
  if (Hr) ze(iYR(R), $i);
  Hm(T, 2), T.view.setUint16(T.offset, R, !0), T.offset += 2;
}
function ge(T) {
  Um(T, 4);
  let R = T.view.getUint32(T.offset, !0);
  return T.offset += 4, R;
}
function $e(T, R) {
  if (Hr) ze(un(R), $i);
  Hm(T, 4), T.view.setUint32(T.offset, R, !0), T.offset += 4;
}
function Ws(T) {
  Um(T, 8);
  let R = T.view.getBigUint64(T.offset, !0);
  return T.offset += 8, R;
}
function qs(T, R) {
  if (Hr) ze(cYR(R), $i);
  Hm(T, 8), T.view.setBigUint64(T.offset, R, !0), T.offset += 8;
}
function UR(T) {
  let R = s3(T);
  if (R >= 128) {
    R &= 127;
    let a = 128,
      e = 1,
      t;
    do t = s3(T), R += (t & 127) * a, a *= 128, e++; while (t >= 128 && e < 7);
    let r = 0;
    a = 1;
    while (t >= 128 && e < uyT) t = s3(T), r += (t & 127) * a, a *= 128, e++;
    if (t === 0 || e === uyT && t > 1) throw T.offset -= e, new I0(T.offset, zaT);
    return BigInt(R) + (BigInt(r) << BigInt(49));
  }
  return BigInt(R);
}