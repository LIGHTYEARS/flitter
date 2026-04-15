function Qf0(T) {
  let R = Vf0.get(T.tagName);
  if (R != null) T.tagName = R, T.tagID = DH(T.tagName);
}
function Zf0(T, R) {
  return R === VR.MATHML && (T === sT.MI || T === sT.MO || T === sT.MN || T === sT.MS || T === sT.MTEXT);
}
function Jf0(T, R, a) {
  if (R === VR.MATHML && T === sT.ANNOTATION_XML) {
    for (let e = 0; e < a.length; e++) if (a[e].name === gb.ENCODING) {
      let t = a[e].value.toLowerCase();
      return t === gfT.TEXT_HTML || t === gfT.APPLICATION_XML;
    }
  }
  return R === VR.SVG && (T === sT.FOREIGN_OBJECT || T === sT.DESC || T === sT.TITLE);
}