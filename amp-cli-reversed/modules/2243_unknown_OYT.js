function hg0(T) {
  T._reconstructActiveFormattingElements(), T._insertFakeElement(pR.BR, sT.BR), T.openElements.pop(), T.framesetOk = !1;
}
function OYT(T, R) {
  let {
    tagName: a,
    tagID: e
  } = R;
  for (let t = T.openElements.stackTop; t > 0; t--) {
    let r = T.openElements.items[t],
      h = T.openElements.tagIDs[t];
    if (e === h && (e !== sT.UNKNOWN || T.treeAdapter.getTagName(r) === a)) {
      if (T.openElements.generateImpliedEndTagsWithExclusion(e), T.openElements.stackTop >= t) T.openElements.shortenToLength(t);
      break;
    }
    if (T._isSpecialElement(r, h)) break;
  }
}