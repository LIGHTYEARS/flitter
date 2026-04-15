function fg0(T, R) {
  let a = R.tagID;
  if (a === sT.CAPTION || a === sT.TABLE || a === sT.TBODY || a === sT.TFOOT || a === sT.THEAD || a === sT.TR || a === sT.TD || a === sT.TH) {
    if (T.openElements.hasInTableScope(a)) T.openElements.popUntilTagNamePopped(sT.SELECT), T._resetInsertionMode(), T.onEndTag(R);
  } else wYT(T, R);
}