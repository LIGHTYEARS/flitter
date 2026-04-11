// Module: sse-error
// Original: ZMT
// Type: ESM (PT wrapper)
// Exports: QMT
// Category: util

// Module: ZMT (ESM)
() => {
  (tyR(),
    YA(),
    N9T(),
    (QMT = class extends Error {
      constructor(R, a, e) {
        super(`SSE error: ${a}`);
        ((this.code = R), (this.event = e));
      }
    }));
};
