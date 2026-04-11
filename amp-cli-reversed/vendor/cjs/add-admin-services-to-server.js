// Module: add-admin-services-to-server
// Original: dZ
// Type: CJS (RT wrapper)
// Exports: addAdminServicesToServer, registerAdminService
// Category: util

// Module: dZ (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.registerAdminService = a),
    (T.addAdminServicesToServer = e));
  var R = [];
  function a(t, r) {
    R.push({ getServiceDefinition: t, getHandlers: r });
  }
  function e(t) {
    for (let { getServiceDefinition: r, getHandlers: h } of R)
      t.addService(r(), h());
  }
};
