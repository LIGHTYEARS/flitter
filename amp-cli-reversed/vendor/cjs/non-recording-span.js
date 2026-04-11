// Module: non-recording-span
// Original: iZ
// Type: CJS (RT wrapper)
// Exports: NonRecordingSpan
// Category: util

// Module: iZ (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.NonRecordingSpan = void 0));
  var R = hZ();
  class a {
    constructor(e = R.INVALID_SPAN_CONTEXT) {
      this._spanContext = e;
    }
    spanContext() {
      return this._spanContext;
    }
    setAttribute(e, t) {
      return this;
    }
    setAttributes(e) {
      return this;
    }
    addEvent(e, t) {
      return this;
    }
    addLink(e) {
      return this;
    }
    addLinks(e) {
      return this;
    }
    setStatus(e) {
      return this;
    }
    updateName(e) {
      return this;
    }
    end(e) {}
    isRecording() {
      return !1;
    }
    recordException(e, t) {}
  }
  T.NonRecordingSpan = a;
};
