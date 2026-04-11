// Module: module-ya-n9t-rDT
// Original: rDT
// Type: ESM (PT wrapper)
// Exports: I_, tDT
// Category: util

// Module: rDT (ESM)
() => {
  (YA(),
    N9T(),
    RPR(),
    (tDT = {
      initialReconnectionDelay: 1000,
      maxReconnectionDelay: 30000,
      reconnectionDelayGrowFactor: 1.5,
      maxRetries: 2,
    }),
    (I_ = class extends Error {
      constructor(R, a) {
        super(`Streamable HTTP error: ${a}`);
        this.code = R;
      }
    }));
};
