// Module: unknown-SN
// Original: SN
// Type: CJS (RT wrapper)
// Exports: default
// Category: unknown

// Module: SN (CJS)
(T) => {
  Object.defineProperty(T, "__esModule", { value: !0 });
  class R extends Error {
    constructor(a) {
      super("validation failed");
      ((this.errors = a), (this.ajv = this.validation = !0));
    }
  }
  T.default = R;
};
