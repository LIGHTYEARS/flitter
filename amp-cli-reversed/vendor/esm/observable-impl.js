// Module: observable-impl
// Original: GS
// Type: ESM (PT wrapper)
// Exports: AR
// Category: util

// Module: GS (ESM)
() => {
  if (!Symbol.observable) Symbol.observable = Symbol("observable");
  AR = class T {
    _subscriber;
    constructor(R) {
      if (!(this instanceof T))
        throw TypeError("Observable cannot be called as a function");
      if (typeof R !== "function")
        throw TypeError("Observable initializer must be a function");
      this._subscriber = R;
    }
    subscribe(R, a, e) {
      if (typeof R !== "object" || R === null)
        R = { next: R, error: a, complete: e };
      return new TET(R, this._subscriber);
    }
    pipe(R, ...a) {
      let e = this;
      for (let t of [R, ...a]) e = t(e);
      return e;
    }
    [Symbol.observable]() {
      return this;
    }
    static from(R) {
      let a = typeof T === "function" ? T : T;
      if (R == null) throw TypeError(R + " is not an object");
      let e = R[Symbol.observable];
      if (typeof e === "function") {
        let r = e.call(R);
        if (Object(r) !== r) throw TypeError(r + " is not an object");
        if (r instanceof T) return r;
        return new a((h) => r.subscribe(h));
      }
      let t = R[Symbol.iterator];
      if (typeof t === "function")
        return new a((r) => {
          AL(() => {
            if (r.closed) return;
            for (let h of t.call(R)) if ((r.next(h), r.closed)) return;
            r.complete();
          });
        });
      if (Array.isArray(R))
        return new a((r) => {
          AL(() => {
            if (r.closed) return;
            for (let h of R) if ((r.next(h), r.closed)) return;
            r.complete();
          });
        });
      throw TypeError(R + " is not observable");
    }
    static of(...R) {
      return new (typeof T === "function" ? T : T)((a) => {
        AL(() => {
          if (a.closed) return;
          for (let e of R) if ((a.next(e), a.closed)) return;
          a.complete();
        });
      });
    }
    static get [Symbol.species]() {
      return T;
    }
  };
};
