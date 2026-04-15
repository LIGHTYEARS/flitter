function kI0(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.BODY:
      {
        T._insertElement(R, VR.HTML), T.framesetOk = !1, T.insertionMode = YT.IN_BODY;
        break;
      }
    case sT.FRAMESET:
      {
        T._insertElement(R, VR.HTML), T.insertionMode = YT.IN_FRAMESET;
        break;
      }
    case sT.BASE:
    case sT.BASEFONT:
    case sT.BGSOUND:
    case sT.LINK:
    case sT.META:
    case sT.NOFRAMES:
    case sT.SCRIPT:
    case sT.STYLE:
    case sT.TEMPLATE:
    case sT.TITLE:
      {
        T._err(R, vR.abandonedHeadElementChild), T.openElements.push(T.headElement, sT.HEAD), Bc(T, R), T.openElements.remove(T.headElement);
        break;
      }
    case sT.HEAD:
      {
        T._err(R, vR.misplacedStartTagForHeadElement);
        break;
      }
    default:
      Dv(T, R);
  }
}