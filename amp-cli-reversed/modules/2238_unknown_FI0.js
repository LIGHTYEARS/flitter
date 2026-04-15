function jYT(T, R) {
  T._reconstructActiveFormattingElements(), T._appendElement(R, VR.HTML), T.framesetOk = !1, R.ackSelfClosing = !0;
}
function SYT(T) {
  let R = lYT(T, gb.TYPE);
  return R != null && R.toLowerCase() === RI0;
}
function BI0(T, R) {
  if (T._reconstructActiveFormattingElements(), T._appendElement(R, VR.HTML), !SYT(R)) T.framesetOk = !1;
  R.ackSelfClosing = !0;
}
function NI0(T, R) {
  T._appendElement(R, VR.HTML), R.ackSelfClosing = !0;
}
function UI0(T, R) {
  if (T.openElements.hasInButtonScope(sT.P)) T._closePElement();
  T._appendElement(R, VR.HTML), T.framesetOk = !1, R.ackSelfClosing = !0;
}
function HI0(T, R) {
  R.tagName = pR.IMG, R.tagID = sT.IMG, jYT(T, R);
}
function WI0(T, R) {
  T._insertElement(R, VR.HTML), T.skipNextNewLine = !0, T.tokenizer.state = gr.RCDATA, T.originalInsertionMode = T.insertionMode, T.framesetOk = !1, T.insertionMode = YT.TEXT;
}
function qI0(T, R) {
  if (T.openElements.hasInButtonScope(sT.P)) T._closePElement();
  T._reconstructActiveFormattingElements(), T.framesetOk = !1, T._switchToTextParsing(R, gr.RAWTEXT);
}
function zI0(T, R) {
  T.framesetOk = !1, T._switchToTextParsing(R, gr.RAWTEXT);
}
function vfT(T, R) {
  T._switchToTextParsing(R, gr.RAWTEXT);
}
function FI0(T, R) {
  T._reconstructActiveFormattingElements(), T._insertElement(R, VR.HTML), T.framesetOk = !1, T.insertionMode = T.insertionMode === YT.IN_TABLE || T.insertionMode === YT.IN_CAPTION || T.insertionMode === YT.IN_TABLE_BODY || T.insertionMode === YT.IN_ROW || T.insertionMode === YT.IN_CELL ? YT.IN_SELECT_IN_TABLE : YT.IN_SELECT;
}