function uF() {
  if (!yY) {
    if (cXT()) return {
      requestLayout: () => {},
      requestPaint: () => {},
      removeFromQueues: () => {}
    };
    throw Error("Paint scheduler not initialized. Make sure WidgetsBinding is created.");
  }
  return yY;
}