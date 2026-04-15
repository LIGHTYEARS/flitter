function YuT(T) {
  let {
    byteLength: R
  } = T;
  if (R === 6) return T.getUint16(0) * 4294967296 + T.getUint32(2);
  if (R === 5) return T.getUint8(0) * 4294967296 + T.getUint32(1);
  if (R === 4) return T.getUint32(0);
  if (R === 3) return T.getUint8(0) * 65536 + T.getUint16(1);
  if (R === 2) return T.getUint16(0);
  if (R === 1) return T.getUint8(0);
}