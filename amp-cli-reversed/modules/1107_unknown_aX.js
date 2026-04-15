function rHT(T, R, a) {
  a.bytesFilled += R;
}
function hHT(T) {
  T._queueTotalSize === 0 && T._closeRequested ? (H7(T), iv(T._controlledReadableByteStream)) : Hb(T);
}
function L3T(T) {
  T._byobRequest !== null && (T._byobRequest._associatedReadableByteStreamController = void 0, T._byobRequest._view = null, T._byobRequest = null);
}
function aX(T) {
  for (; T._pendingPullIntos.length > 0;) {
    if (T._queueTotalSize === 0) return;
    let R = T._pendingPullIntos.peek();
    tHT(T, R) && (BP(T), RX(T._controlledReadableByteStream, R));
  }
}