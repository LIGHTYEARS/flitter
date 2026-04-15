function mI0(T, R) {
  let a = R.tagID;
  if (a === sT.HEAD || a === sT.BODY || a === sT.HTML || a === sT.BR) Cv(T, R);else T._err(R, vR.endTagWithoutMatchingOpenElement);
}
function Cv(T, R) {
  T._insertFakeElement(pR.HEAD, sT.HEAD), T.headElement = T.openElements.current, T.insertionMode = YT.IN_HEAD, T._processToken(R);
}
function Bc(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.BASE:
    case sT.BASEFONT:
    case sT.BGSOUND:
    case sT.LINK:
    case sT.META:
      {
        T._appendElement(R, VR.HTML), R.ackSelfClosing = !0;
        break;
      }
    case sT.TITLE:
      {
        T._switchToTextParsing(R, gr.RCDATA);
        break;
      }
    case sT.NOSCRIPT:
      {
        if (T.options.scriptingEnabled) T._switchToTextParsing(R, gr.RAWTEXT);else T._insertElement(R, VR.HTML), T.insertionMode = YT.IN_HEAD_NO_SCRIPT;
        break;
      }
    case sT.NOFRAMES:
    case sT.STYLE:
      {
        T._switchToTextParsing(R, gr.RAWTEXT);
        break;
      }
    case sT.SCRIPT:
      {
        T._switchToTextParsing(R, gr.SCRIPT_DATA);
        break;
      }
    case sT.TEMPLATE:
      {
        T._insertTemplate(R), T.activeFormattingElements.insertMarker(), T.framesetOk = !1, T.insertionMode = YT.IN_TEMPLATE, T.tmplInsertionModeStack.unshift(YT.IN_TEMPLATE);
        break;
      }
    case sT.HEAD:
      {
        T._err(R, vR.misplacedStartTagForHeadElement);
        break;
      }
    default:
      Lv(T, R);
  }
}