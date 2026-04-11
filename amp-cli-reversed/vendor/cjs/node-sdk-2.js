// Module: node-sdk-2
// Original: biR
// Type: CJS (RT wrapper)
// Exports: NodeSDK, api, contextBase, core, logs, metrics, node, resources, tracing
// Category: util

// Module: biR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.NodeSDK =
      T.tracing =
      T.resources =
      T.node =
      T.metrics =
      T.logs =
      T.core =
      T.contextBase =
      T.api =
        void 0),
    (T.api = n0()),
    (T.contextBase = n0()),
    (T.core = $9()),
    (T.logs = H$T()),
    (T.metrics = ox()),
    (T.node = J$T()),
    (T.resources = sx()),
    (T.tracing = nx()));
  var R = _iR();
  Object.defineProperty(T, "NodeSDK", {
    enumerable: !0,
    get: function () {
      return R.NodeSDK;
    },
  });
};
