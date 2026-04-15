function MbT(T, R) {
  let a = T._pendingPullIntos.peek();
  L3T(T), T._controlledReadableByteStream._state === "closed" ? function (e, t) {
    t.readerType === "none" && BP(e);
    let r = e._controlledReadableByteStream;
    if (M3T(r)) for (; cHT(r) > 0;) RX(r, BP(e));
  }(T, a) : function (e, t, r) {
    if (rHT(0, t, r), r.readerType === "none") return eHT(e, r), void aX(e);
    if (r.bytesFilled < r.elementSize) return;
    BP(e);
    let h = r.bytesFilled % r.elementSize;
    if (h > 0) {
      let i = r.byteOffset + r.bytesFilled;
      aHT(e, r.buffer, i - h, h);
    }
    r.bytesFilled -= h, RX(e._controlledReadableByteStream, r), aX(e);
  }(T, R, a), Hb(T);
}