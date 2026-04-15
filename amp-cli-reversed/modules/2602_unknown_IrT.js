function tf(T) {
  return T.replace(uM0, "").replace(yM0, "").replace(mM0, "").trim();
}
function Xm(T) {
  if (tf(T.thinking).length > 0) return !0;
  return T.signature.trim().length > 0;
}
function IrT(T) {
  let R = T.split(`
`);
  for (let a = 0; a < R.length; a++) {
    let e = R[a]?.trim();
    if (!e) continue;
    let t = e.match(PJT);
    if (t?.[1]) {
      let h = t[1].trim();
      if (h) return {
        header: h,
        lineIndex: a
      };
    }
    let r = e.match(kJT);
    if (r?.[1]) {
      let h = r[1].trim();
      if (h) return {
        header: h,
        lineIndex: a
      };
    }
    break;
  }
  return {};
}