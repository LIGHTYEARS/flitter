// Module: module-gs-constructor-y0T
// Original: y0T
// Type: ESM (PT wrapper)
// Exports: R, W0, _observers, f0
// Category: util

// Module: y0T (ESM)
() => {
  (GS(),
    (W0 = class extends AR {
      _observers = new Set();
      constructor() {
        super((R) => {
          return (this._observers.add(R), () => this._observers.delete(R));
        });
      }
      next(R) {
        for (let a of this._observers) a.next(R);
      }
      error(R) {
        for (let a of this._observers) a.error(R);
      }
      complete() {
        for (let R of this._observers) R.complete();
      }
    }),
    (f0 = class extends W0 {
      currentValue;
      constructor(R) {
        super();
        this.currentValue = R;
      }
      next(R) {
        ((this.currentValue = R), super.next(R));
      }
      subscribe(R, a, e) {
        if (typeof R !== "object" || R === null) {
          let t = {};
          if (R) t.next = R;
          if (a) t.error = a;
          if (e) t.complete = e;
          R = t;
        }
        return (R.next?.(this.currentValue), super.subscribe(R));
      }
      getValue() {
        return this.currentValue;
      }
    }));
};
