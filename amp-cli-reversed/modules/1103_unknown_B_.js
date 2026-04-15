function lA(T) {
  T._queue = new Dh(), T._queueTotalSize = 0;
}
class B_ {
  constructor() {
    throw TypeError("Illegal constructor");
  }
  get view() {
    if (!W5(this)) throw q5("view");
    return this._view;
  }
  respond(T) {
    if (!W5(this)) throw q5("respond");
    if (mn(T, 1, "respond"), T = VUT(T, "First parameter"), this._associatedReadableByteStreamController === void 0) throw TypeError("This BYOB request has been invalidated");
    this._view.buffer, function (R, a) {
      let e = R._pendingPullIntos.peek();
      if (R._controlledReadableByteStream._state === "closed") {
        if (a !== 0) throw TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
      } else {
        if (a === 0) throw TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
        if (e.bytesFilled + a > e.byteLength) throw RangeError("bytesWritten out of range");
      }
      e.buffer = e.buffer, MbT(R, a);
    }(this._associatedReadableByteStreamController, T);
  }
  respondWithNewView(T) {
    if (!W5(this)) throw q5("respondWithNewView");
    if (mn(T, 1, "respondWithNewView"), !ArrayBuffer.isView(T)) throw TypeError("You can only respond with array buffer views");
    if (this._associatedReadableByteStreamController === void 0) throw TypeError("This BYOB request has been invalidated");
    T.buffer, function (R, a) {
      let e = R._pendingPullIntos.peek();
      if (R._controlledReadableByteStream._state === "closed") {
        if (a.byteLength !== 0) throw TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
      } else if (a.byteLength === 0) throw TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
      if (e.byteOffset + e.bytesFilled !== a.byteOffset) throw RangeError("The region specified by view does not match byobRequest");
      if (e.bufferByteLength !== a.buffer.byteLength) throw RangeError("The buffer of view has different capacity than byobRequest");
      if (e.bytesFilled + a.byteLength > e.byteLength) throw RangeError("The region specified by view is larger than byobRequest");
      let t = a.byteLength;
      e.buffer = a.buffer, MbT(R, t);
    }(this._associatedReadableByteStreamController, T);
  }
}