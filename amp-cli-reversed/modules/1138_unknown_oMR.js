async function* sMR(T) {
  let R = 0;
  while (R !== T.size) {
    let a = await T.slice(R, Math.min(T.size, R + LHT)).arrayBuffer();
    R += a.byteLength, yield new Uint8Array(a);
  }
}
async function* V5(T, R = !1) {
  for (let a of T) if (ArrayBuffer.isView(a)) {
    if (R) yield* cMR(a);else yield a;
  } else if (pe(a.stream)) yield* a.stream();else yield* sMR(a);
}
function* oMR(T, R, a = 0, e) {
  e !== null && e !== void 0 || (e = R);
  let t = a < 0 ? Math.max(R + a, 0) : Math.min(a, R),
    r = e < 0 ? Math.max(R + e, 0) : Math.min(e, R),
    h = Math.max(r - t, 0),
    i = 0;
  for (let c of T) {
    if (i >= h) break;
    let s = ArrayBuffer.isView(c) ? c.byteLength : c.size;
    if (t && s <= t) t -= s, r -= s;else {
      let A;
      if (ArrayBuffer.isView(c)) A = c.subarray(t, Math.min(s, r)), i += A.byteLength;else A = c.slice(t, Math.min(s, r)), i += A.size;
      r -= s, t = 0, yield A;
    }
  }
}