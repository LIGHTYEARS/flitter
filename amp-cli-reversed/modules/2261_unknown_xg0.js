function xg0(T, R) {
  let a = R.tagID;
  if (a === sT.CAPTION || a === sT.TABLE || a === sT.TBODY || a === sT.TFOOT || a === sT.THEAD || a === sT.TR || a === sT.TD || a === sT.TH) T.openElements.popUntilTagNamePopped(sT.SELECT), T._resetInsertionMode(), T._processStartTag(R);else DYT(T, R);
}