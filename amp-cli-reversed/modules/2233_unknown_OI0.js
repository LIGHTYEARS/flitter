function OI0(T, R) {
  T.framesetOk = !1;
  let a = R.tagID;
  for (let e = T.openElements.stackTop; e >= 0; e--) {
    let t = T.openElements.tagIDs[e];
    if (a === sT.LI && t === sT.LI || (a === sT.DD || a === sT.DT) && (t === sT.DD || t === sT.DT)) {
      T.openElements.generateImpliedEndTagsWithExclusion(t), T.openElements.popUntilTagNamePopped(t);
      break;
    }
    if (t !== sT.ADDRESS && t !== sT.DIV && t !== sT.P && T._isSpecialElement(T.openElements.items[e], t)) break;
  }
  if (T.openElements.hasInButtonScope(sT.P)) T._closePElement();
  T._insertElement(R, VR.HTML);
}