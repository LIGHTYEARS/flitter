function Dg0(T, R) {
  if (R.tagID === sT.P || R.tagID === sT.BR) {
    UYT(T), T._endTagOutsideForeignContent(R);
    return;
  }
  for (let a = T.openElements.stackTop; a > 0; a--) {
    let e = T.openElements.items[a];
    if (T.treeAdapter.getNamespaceURI(e) === VR.HTML) {
      T._endTagOutsideForeignContent(R);
      break;
    }
    let t = T.treeAdapter.getTagName(e);
    if (t.toLowerCase() === R.tagName) {
      R.tagName = t, T.openElements.shortenToLength(a);
      break;
    }
  }
}