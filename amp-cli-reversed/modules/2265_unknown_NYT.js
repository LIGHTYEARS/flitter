function $g0(T, R) {
  if (R.tagID === sT.HTML) bt(T, R);else Zw(T, R);
}
function NYT(T, R) {
  var a;
  if (R.tagID === sT.HTML) {
    if (!T.fragmentContext) T.insertionMode = YT.AFTER_AFTER_BODY;
    if (T.options.sourceCodeLocationInfo && T.openElements.tagIDs[0] === sT.HTML) {
      T._setEndLocation(T.openElements.items[0], R);
      let e = T.openElements.items[1];
      if (e && !((a = T.treeAdapter.getNodeSourceCodeLocation(e)) === null || a === void 0 ? void 0 : a.endTag)) T._setEndLocation(e, R);
    }
  } else Zw(T, R);
}