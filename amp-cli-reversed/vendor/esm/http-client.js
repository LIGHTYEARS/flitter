// Module: http-client
// Original: Ii
// Type: ESM (PT wrapper)
// Exports: F$, FG, GG, KG, VG, XG, YG, f9, h8T, pi, pr, qG, zG
// Category: util

// Module: Ii (ESM)
() => {
  ((f9 = class extends Error {}),
    (pr = class T extends f9 {
      constructor(R, a, e, t) {
        super(`${T.makeMessage(R, a, e)}`);
        ((this.status = R),
          (this.headers = t),
          (this.requestID = t?.get("request-id")),
          (this.error = a));
      }
      static makeMessage(R, a, e) {
        let t = a?.message
          ? typeof a.message === "string"
            ? a.message
            : JSON.stringify(a.message)
          : a
            ? JSON.stringify(a)
            : e;
        if (R && t) return `${R} ${t}`;
        if (R) return `${R} status code (no body)`;
        if (t) return t;
        return "(no status code or body)";
      }
      static generate(R, a, e, t) {
        if (!R || !t) return new F$({ message: e, cause: WG(a) });
        let r = a;
        if (R === 400) return new qG(R, r, e, t);
        if (R === 401) return new zG(R, r, e, t);
        if (R === 403) return new FG(R, r, e, t);
        if (R === 404) return new GG(R, r, e, t);
        if (R === 409) return new KG(R, r, e, t);
        if (R === 422) return new VG(R, r, e, t);
        if (R === 429) return new XG(R, r, e, t);
        if (R >= 500) return new YG(R, r, e, t);
        return new T(R, r, e, t);
      }
    }),
    (pi = class extends pr {
      constructor({ message: R } = {}) {
        super(void 0, void 0, R || "Request was aborted.", void 0);
      }
    }),
    (F$ = class extends pr {
      constructor({ message: R, cause: a }) {
        super(void 0, void 0, R || "Connection error.", void 0);
        if (a) this.cause = a;
      }
    }),
    (h8T = class extends F$ {
      constructor({ message: R } = {}) {
        super({ message: R ?? "Request timed out." });
      }
    }),
    (qG = class extends pr {}),
    (zG = class extends pr {}),
    (FG = class extends pr {}),
    (GG = class extends pr {}),
    (KG = class extends pr {}),
    (VG = class extends pr {}),
    (XG = class extends pr {}),
    (YG = class extends pr {}));
};
