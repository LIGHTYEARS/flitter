function ZI0(T, R) {
  if (T.openElements.hasInScope(sT.BODY)) T.insertionMode = YT.AFTER_BODY, NYT(T, R);
}
function JI0(T, R) {
  let a = R.tagID;
  if (T.openElements.hasInScope(a)) T.openElements.generateImpliedEndTags(), T.openElements.popUntilTagNamePopped(a);
}
function Tg0(T) {
  let R = T.openElements.tmplCount > 0,
    {
      formElement: a
    } = T;
  if (!R) T.formElement = null;
  if ((a || R) && T.openElements.hasInScope(sT.FORM)) {
    if (T.openElements.generateImpliedEndTags(), R) T.openElements.popUntilTagNamePopped(sT.FORM);else if (a) T.openElements.remove(a);
  }
}