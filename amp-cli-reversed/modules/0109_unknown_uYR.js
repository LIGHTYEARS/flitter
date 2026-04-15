function D8(T, R) {
  if (Hr) ze(sYR(R), $i);
  let a = 1,
    e = R;
  while (e >= 128 && a < Aw) dR(T, 128 | e & 127), e = Math.floor(e / 128), a++;
  if (a === Aw) e &= 15;
  dR(T, e);
}
function _YR(T) {
  return OFT(T, SFT(T));
}
function bYR(T, R) {
  T1(T, R.length), FaT(T, R);
}
function OFT(T, R) {
  return dFT(T, R).slice();
}
function FaT(T, R) {
  let a = R.length;
  if (a > 0) Hm(T, a), T.bytes.set(R, T.offset), T.offset += a;
}
function dFT(T, R) {
  if (Hr) ze(un(R));
  Um(T, R);
  let a = T.offset;
  return T.offset += R, T.bytes.subarray(a, a + R);
}
function E0(T) {
  return _YR(T).buffer;
}
function C0(T, R) {
  bYR(T, new Uint8Array(R));
}
function VU(T, R) {
  if (Hr) ze(un(R));
  return OFT(T, R).buffer;
}
function XU(T, R) {
  FaT(T, new Uint8Array(R));
}
function KR(T) {
  return mYR(T, SFT(T));
}
function YR(T, R) {
  if (R.length < nYR) {
    let a = PYR(R);
    T1(T, a), Hm(T, a), yYR(T, R);
  } else {
    let a = xYR.encode(R);
    T1(T, a.length), FaT(T, a);
  }
}
function mYR(T, R) {
  if (Hr) ze(un(R));
  if (R < oYR) return uYR(T, R);
  try {
    return kYR.decode(dFT(T, R));
  } catch (a) {
    throw new I0(T.offset, vFT);
  }
}
function uYR(T, R) {
  Um(T, R);
  let a = "",
    e = T.bytes,
    t = T.offset,
    r = t + R;
  while (t < r) {
    let h = e[t++];
    if (h > 127) {
      let i = !0,
        c = h;
      if (t < r && h < 224) {
        let s = e[t++];
        h = (c & 31) << 6 | s & 63, i = h >> 7 === 0 || c >> 5 !== 6 || s >> 6 !== 2;
      } else if (t + 1 < r && h < 240) {
        let s = e[t++],
          A = e[t++];
        h = (c & 15) << 12 | (s & 63) << 6 | A & 63, i = h >> 11 === 0 || h >> 11 === 27 || c >> 4 !== 14 || s >> 6 !== 2 || A >> 6 !== 2;
      } else if (t + 2 < r) {
        let s = e[t++],
          A = e[t++],
          l = e[t++];
        h = (c & 7) << 18 | (s & 63) << 12 | (A & 63) << 6 | l & 63, i = h >> 16 === 0 || h > 1114111 || c >> 3 !== 30 || s >> 6 !== 2 || A >> 6 !== 2 || l >> 6 !== 2;
      }
      if (i) throw new I0(T.offset, vFT);
    }
    a += String.fromCodePoint(h);
  }
  return T.offset = t, a;
}