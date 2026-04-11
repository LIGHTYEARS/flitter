// Module: default-resource-2
// Original: sx
// Type: CJS (RT wrapper)
// Exports: defaultResource, defaultServiceName, detectResources, emptyResource, envDetector, hostDetector, osDetector, processDetector, resourceFromAttributes, serviceInstanceIdDetector
// Category: util

// Module: sx (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.defaultServiceName =
      T.emptyResource =
      T.defaultResource =
      T.resourceFromAttributes =
      T.serviceInstanceIdDetector =
      T.processDetector =
      T.osDetector =
      T.hostDetector =
      T.envDetector =
      T.detectResources =
        void 0));
  var R = EeR();
  Object.defineProperty(T, "detectResources", {
    enumerable: !0,
    get: function () {
      return R.detectResources;
    },
  });
  var a = KeR();
  (Object.defineProperty(T, "envDetector", {
    enumerable: !0,
    get: function () {
      return a.envDetector;
    },
  }),
    Object.defineProperty(T, "hostDetector", {
      enumerable: !0,
      get: function () {
        return a.hostDetector;
      },
    }),
    Object.defineProperty(T, "osDetector", {
      enumerable: !0,
      get: function () {
        return a.osDetector;
      },
    }),
    Object.defineProperty(T, "processDetector", {
      enumerable: !0,
      get: function () {
        return a.processDetector;
      },
    }),
    Object.defineProperty(T, "serviceInstanceIdDetector", {
      enumerable: !0,
      get: function () {
        return a.serviceInstanceIdDetector;
      },
    }));
  var e = N$T();
  (Object.defineProperty(T, "resourceFromAttributes", {
    enumerable: !0,
    get: function () {
      return e.resourceFromAttributes;
    },
  }),
    Object.defineProperty(T, "defaultResource", {
      enumerable: !0,
      get: function () {
        return e.defaultResource;
      },
    }),
    Object.defineProperty(T, "emptyResource", {
      enumerable: !0,
      get: function () {
        return e.emptyResource;
      },
    }));
  var t = B$T();
  Object.defineProperty(T, "defaultServiceName", {
    enumerable: !0,
    get: function () {
      return t.defaultServiceName;
    },
  });
};
