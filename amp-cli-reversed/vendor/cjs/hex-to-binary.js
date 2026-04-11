// Module: hex-to-binary
// Original: nrR
// Type: CJS (RT wrapper)
// Exports: hexToBinary
// Category: util

// Module: nrR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.hexToBinary = void 0));
  function R(e) {
    if (e >= 48 && e <= 57) return e - 48;
    if (e >= 97 && e <= 102) return e - 87;
    return e - 55;
  }
  function a(e) {
    let t = new Uint8Array(e.length / 2),
      r = 0;
    for (let h = 0; h < e.length; h += 2) {
      let i = R(e.charCodeAt(h)),
        c = R(e.charCodeAt(h + 1));
      t[r++] = (i << 4) | c;
    }
    return t;
  }
  T.hexToBinary = a;
};
