function BdT(T) {
  return T === "windows" ? 1 : void 0;
}
function tiT(T, R, a) {
  let e;
  for (let t = 0; t < T.length; t++) {
    let r = T.charCodeAt(t);
    if (r >= 97 && r <= 122 || r >= 65 && r <= 90 || r >= 48 && r <= 57 || r === 45 || r === 46 || r === 95 || r === 126 || R && r === 47 || a && r === 91 || a && r === 93 || a && r === 58) {
      if (e !== void 0) e += T.charAt(t);
    } else {
      if (e === void 0) e = T.substring(0, t);
      let h = b0T[r];
      if (h !== void 0) e += h;else e += encodeURIComponent(T.charAt(t));
    }
  }
  return e !== void 0 ? e : T;
}