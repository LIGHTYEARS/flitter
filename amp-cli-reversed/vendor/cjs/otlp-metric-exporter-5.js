// Module: otlp-metric-exporter-5
// Original: MhR
// Type: CJS (RT wrapper)
// Exports: OTLPMetricExporter
// Category: util

// Module: mhR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.StatusBuilder = void 0));
  class R {
    constructor() {
      ((this.code = null), (this.details = null), (this.metadata = null));
    }
    withCode(a) {
      return ((this.code = a), this);
    }
    withDetails(a) {
      return ((this.details = a), this);
    }
    withMetadata(a) {
      return ((this.metadata = a), this);
    }
    build() {
      let a = {};
      if (this.code !== null) a.code = this.code;
      if (this.details !== null) a.details = this.details;
      if (this.metadata !== null) a.metadata = this.metadata;
      return a;
    }
  }
  T.StatusBuilder = R;
};
