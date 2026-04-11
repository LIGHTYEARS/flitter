// Module: create-service-client-constructor
// Original: fhR
// Type: CJS (RT wrapper)
// Exports: createServiceClientConstructor
// Category: util

// Module: fhR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.createServiceClientConstructor = void 0));
  var R = cL();
  function a(e, t) {
    let r = {
      export: {
        path: e,
        requestStream: !1,
        responseStream: !1,
        requestSerialize: (h) => {
          return h;
        },
        requestDeserialize: (h) => {
          return h;
        },
        responseSerialize: (h) => {
          return h;
        },
        responseDeserialize: (h) => {
          return h;
        },
      },
    };
    return R.makeGenericClientConstructor(r, t);
  }
  T.createServiceClientConstructor = a;
};
