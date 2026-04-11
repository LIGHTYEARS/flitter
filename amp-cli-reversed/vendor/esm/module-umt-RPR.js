// Module: module-umt-RPR
// Original: RPR
// Type: ESM (PT wrapper)
// Exports: eDT, t
// Category: util

// Module: RPR (ESM)
() => {
  (UMT(),
    (eDT = class extends TransformStream {
      constructor({ onError: R, onRetry: a, onComment: e } = {}) {
        let t;
        super({
          start(r) {
            t = NMT({
              onEvent: (h) => {
                r.enqueue(h);
              },
              onError(h) {
                R === "terminate" ? r.error(h) : typeof R == "function" && R(h);
              },
              onRetry: a,
              onComment: e,
            });
          },
          transform(r) {
            t.feed(r);
          },
        });
      }
    }));
};
