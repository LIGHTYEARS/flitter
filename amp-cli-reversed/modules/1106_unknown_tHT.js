function RHT(T) {
  let {
    bytesFilled: R,
    elementSize: a
  } = T;
  return new T.viewConstructor(T.buffer, T.byteOffset, R / a);
}
function QL(T, R, a, e) {
  T._queue.push({
    buffer: R,
    byteOffset: a,
    byteLength: e
  }), T._queueTotalSize += e;
}
function aHT(T, R, a, e) {
  let t;
  try {
    t = R.slice(a, a + e);
  } catch (r) {
    throw Sk(T, r), r;
  }
  QL(T, t, 0, e);
}
function eHT(T, R) {
  R.bytesFilled > 0 && aHT(T, R.buffer, R.byteOffset, R.bytesFilled), BP(T);
}
function tHT(T, R) {
  let a = R.elementSize,
    e = R.bytesFilled - R.bytesFilled % a,
    t = Math.min(T._queueTotalSize, R.byteLength - R.bytesFilled),
    r = R.bytesFilled + t,
    h = r - r % a,
    i = t,
    c = !1;
  h > e && (i = h - R.bytesFilled, c = !0);
  let s = T._queue;
  for (; i > 0;) {
    let A = s.peek(),
      l = Math.min(i, A.byteLength),
      o = R.byteOffset + R.bytesFilled;
    JUT(R.buffer, o, A.buffer, A.byteOffset, l), A.byteLength === l ? s.shift() : (A.byteOffset += l, A.byteLength -= l), T._queueTotalSize -= l, rHT(T, l, R), i -= l;
  }
  return c;
}