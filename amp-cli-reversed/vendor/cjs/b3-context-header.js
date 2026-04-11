// Module: b3-context-header
// Original: FB
// Type: CJS (RT wrapper)
// Exports: B3_CONTEXT_HEADER, X_B3_FLAGS, X_B3_PARENT_SPAN_ID, X_B3_SAMPLED, X_B3_SPAN_ID, X_B3_TRACE_ID
// Category: util

// Module: FB (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.X_B3_FLAGS =
      T.X_B3_PARENT_SPAN_ID =
      T.X_B3_SAMPLED =
      T.X_B3_SPAN_ID =
      T.X_B3_TRACE_ID =
      T.B3_CONTEXT_HEADER =
        void 0),
    (T.B3_CONTEXT_HEADER = "b3"),
    (T.X_B3_TRACE_ID = "x-b3-traceid"),
    (T.X_B3_SPAN_ID = "x-b3-spanid"),
    (T.X_B3_SAMPLED = "x-b3-sampled"),
    (T.X_B3_PARENT_SPAN_ID = "x-b3-parentspanid"),
    (T.X_B3_FLAGS = "x-b3-flags"));
};
