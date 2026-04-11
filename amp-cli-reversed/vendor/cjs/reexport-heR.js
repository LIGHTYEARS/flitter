// Module: reexport-heR
// Original: ieR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: ieR (CJS)
(T) => {
  var R =
      (T && T.__createBinding) ||
      (Object.create
        ? function (e, t, r, h) {
            if (h === void 0) h = r;
            var i = Object.getOwnPropertyDescriptor(t, r);
            if (
              !i ||
              ("get" in i ? !t.__esModule : i.writable || i.configurable)
            )
              i = {
                enumerable: !0,
                get: function () {
                  return t[r];
                },
              };
            Object.defineProperty(e, h, i);
          }
        : function (e, t, r, h) {
            if (h === void 0) h = r;
            e[h] = t[r];
          }),
    a =
      (T && T.__exportStar) ||
      function (e, t) {
        for (var r in e)
          if (r !== "default" && !Object.prototype.hasOwnProperty.call(t, r))
            R(t, e, r);
      };
  (Object.defineProperty(T, "__esModule", { value: !0 }), a(heR(), T));
};
