function MJT() {
  return !1;
}
function LD0(T) {
  if (!MJT()) {
    J.warn("initWidgetREPL called without --inspector flag or outside development; ignoring");
    return;
  }
  if (iA) {
    iA.updateRoot(T);
    return;
  }
  iA = new WidgetREPLServer(T), iA.start();
}