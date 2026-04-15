function dI0(T, R) {
  if (T.openElements.hasInButtonScope(sT.P)) T._closePElement();
  T._insertElement(R, VR.HTML), T.tokenizer.state = gr.PLAINTEXT;
}
function EI0(T, R) {
  if (T.openElements.hasInScope(sT.BUTTON)) T.openElements.generateImpliedEndTags(), T.openElements.popUntilTagNamePopped(sT.BUTTON);
  T._reconstructActiveFormattingElements(), T._insertElement(R, VR.HTML), T.framesetOk = !1;
}