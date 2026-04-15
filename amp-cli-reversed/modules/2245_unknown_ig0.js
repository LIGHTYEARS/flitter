function dYT(T, R) {
  if (T.tmplInsertionModeStack.length > 0) BYT(T, R);else JtT(T, R);
}
function ig0(T, R) {
  var a;
  if (R.tagID === sT.SCRIPT) (a = T.scriptHandler) === null || a === void 0 || a.call(T, T.openElements.current);
  T.openElements.pop(), T.insertionMode = T.originalInsertionMode;
}