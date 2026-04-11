// Module: b3-inject-encoding-2
// Original: niR
// Type: CJS (RT wrapper)
// Exports: B3InjectEncoding, B3Propagator, B3_CONTEXT_HEADER, X_B3_FLAGS, X_B3_PARENT_SPAN_ID, X_B3_SAMPLED, X_B3_SPAN_ID, X_B3_TRACE_ID
// Category: util

// Module: niR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.B3InjectEncoding =
      T.X_B3_TRACE_ID =
      T.X_B3_SPAN_ID =
      T.X_B3_SAMPLED =
      T.X_B3_PARENT_SPAN_ID =
      T.X_B3_FLAGS =
      T.B3_CONTEXT_HEADER =
      T.B3Propagator =
        void 0));
  var R = oiR();
  Object.defineProperty(T, "B3Propagator", {
    enumerable: !0,
    get: function () {
      return R.B3Propagator;
    },
  });
  var a = FB();
  (Object.defineProperty(T, "B3_CONTEXT_HEADER", {
    enumerable: !0,
    get: function () {
      return a.B3_CONTEXT_HEADER;
    },
  }),
    Object.defineProperty(T, "X_B3_FLAGS", {
      enumerable: !0,
      get: function () {
        return a.X_B3_FLAGS;
      },
    }),
    Object.defineProperty(T, "X_B3_PARENT_SPAN_ID", {
      enumerable: !0,
      get: function () {
        return a.X_B3_PARENT_SPAN_ID;
      },
    }),
    Object.defineProperty(T, "X_B3_SAMPLED", {
      enumerable: !0,
      get: function () {
        return a.X_B3_SAMPLED;
      },
    }),
    Object.defineProperty(T, "X_B3_SPAN_ID", {
      enumerable: !0,
      get: function () {
        return a.X_B3_SPAN_ID;
      },
    }),
    Object.defineProperty(T, "X_B3_TRACE_ID", {
      enumerable: !0,
      get: function () {
        return a.X_B3_TRACE_ID;
      },
    }));
  var e = HvT();
  Object.defineProperty(T, "B3InjectEncoding", {
    enumerable: !0,
    get: function () {
      return e.B3InjectEncoding;
    },
  });
};
