// Module: grpc-node-use-alternative-resolver
// Original: ihR
// Type: CJS (RT wrapper)
// Exports: GRPC_NODE_USE_ALTERNATIVE_RESOLVER
// Category: util

// Module: ihR (CJS)
(T) => {
  var R;
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.GRPC_NODE_USE_ALTERNATIVE_RESOLVER = void 0),
    (T.GRPC_NODE_USE_ALTERNATIVE_RESOLVER =
      ((R = process.env.GRPC_NODE_USE_ALTERNATIVE_RESOLVER) !== null &&
      R !== void 0
        ? R
        : "false") === "true"));
};
