function wYT(T, R) {
  switch (R.tagID) {
    case sT.OPTGROUP:
      {
        if (T.openElements.stackTop > 0 && T.openElements.currentTagId === sT.OPTION && T.openElements.tagIDs[T.openElements.stackTop - 1] === sT.OPTGROUP) T.openElements.pop();
        if (T.openElements.currentTagId === sT.OPTGROUP) T.openElements.pop();
        break;
      }
    case sT.OPTION:
      {
        if (T.openElements.currentTagId === sT.OPTION) T.openElements.pop();
        break;
      }
    case sT.SELECT:
      {
        if (T.openElements.hasInSelectScope(sT.SELECT)) T.openElements.popUntilTagNamePopped(sT.SELECT), T._resetInsertionMode();
        break;
      }
    case sT.TEMPLATE:
      {
        Vm(T, R);
        break;
      }
    default:
  }
}