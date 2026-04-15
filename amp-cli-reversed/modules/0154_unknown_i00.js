function Ju(T, R) {
  if (typeof T === "string") return T + R;
  if (T instanceof Array) return T.concat(R);
  return Object.assign({}, T, R);
}
function O_() {
  if (!Ir) if (R8.getShared) reT();else throw Error("No packed values available");
  return Ir;
}
function i00(T, R) {
  let a = "get" + T.name.slice(0, -5),
    e;
  if (typeof T === "function") e = T.BYTES_PER_ELEMENT;else T = null;
  for (let t = 0; t < 2; t++) {
    if (!t && e == 1) continue;
    let r = e == 2 ? 1 : e == 4 ? 2 : e == 8 ? 3 : 0;
    Ea[t ? R : R - 4] = e == 1 || t == r00 ? h => {
      if (!T) throw Error("Could not find typed array for code " + R);
      if (!R8.copyBuffers) {
        if (e === 1 || e === 2 && !(h.byteOffset & 1) || e === 4 && !(h.byteOffset & 3) || e === 8 && !(h.byteOffset & 7)) return new T(h.buffer, h.byteOffset, h.byteLength >> r);
      }
      return new T(Uint8Array.prototype.slice.call(h, 0).buffer);
    } : h => {
      if (!T) throw Error("Could not find typed array for code " + R);
      let i = new DataView(h.buffer, h.byteOffset, h.byteLength),
        c = h.length >> r,
        s = new T(c),
        A = i[a];
      for (let l = 0; l < c; l++) s[l] = A.call(i, l << r, t);
      return s;
    };
  }
}