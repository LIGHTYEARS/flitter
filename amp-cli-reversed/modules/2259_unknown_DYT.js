function DYT(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.OPTION:
      {
        if (T.openElements.currentTagId === sT.OPTION) T.openElements.pop();
        T._insertElement(R, VR.HTML);
        break;
      }
    case sT.OPTGROUP:
      {
        if (T.openElements.currentTagId === sT.OPTION) T.openElements.pop();
        if (T.openElements.currentTagId === sT.OPTGROUP) T.openElements.pop();
        T._insertElement(R, VR.HTML);
        break;
      }
    case sT.HR:
      {
        if (T.openElements.currentTagId === sT.OPTION) T.openElements.pop();
        if (T.openElements.currentTagId === sT.OPTGROUP) T.openElements.pop();
        T._appendElement(R, VR.HTML), R.ackSelfClosing = !0;
        break;
      }
    case sT.INPUT:
    case sT.KEYGEN:
    case sT.TEXTAREA:
    case sT.SELECT:
      {
        if (T.openElements.hasInSelectScope(sT.SELECT)) {
          if (T.openElements.popUntilTagNamePopped(sT.SELECT), T._resetInsertionMode(), R.tagID !== sT.SELECT) T._processStartTag(R);
        }
        break;
      }
    case sT.SCRIPT:
    case sT.TEMPLATE:
      {
        Bc(T, R);
        break;
      }
    default:
  }
}