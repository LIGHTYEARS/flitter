function Vm(T, R) {
  if (T.openElements.tmplCount > 0) {
    if (T.openElements.generateImpliedEndTagsThoroughly(), T.openElements.currentTagId !== sT.TEMPLATE) T._err(R, vR.closingOfElementWithOpenChildElements);
    T.openElements.popUntilTagNamePopped(sT.TEMPLATE), T.activeFormattingElements.clearToLastMarker(), T.tmplInsertionModeStack.shift(), T._resetInsertionMode();
  } else T._err(R, vR.endTagWithoutMatchingOpenElement);
}