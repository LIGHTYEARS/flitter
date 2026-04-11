// Module: reexport-Q3R
// Original: Z3R
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: Z3R (CJS)
(T) => {
  var R =
      (T && T.__createBinding) ||
      (Object.create
        ? function (e, t, r, h) {
            if (h === void 0) h = r;
            Object.defineProperty(e, h, {
              enumerable: !0,
              get: function () {
                return t[r];
              },
            });
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
  (Object.defineProperty(T, "__esModule", { value: !0 }), a(Q3R(), T));
};
