function gg0(T, R) {
  if (R.tagID === sT.TEMPLATE) Vm(T, R);
}
function BYT(T, R) {
  if (T.openElements.tmplCount > 0) T.openElements.popUntilTagNamePopped(sT.TEMPLATE), T.activeFormattingElements.clearToLastMarker(), T.tmplInsertionModeStack.shift(), T._resetInsertionMode(), T.onEof(R);else JtT(T, R);
}