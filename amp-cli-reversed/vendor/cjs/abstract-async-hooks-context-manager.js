// Module: abstract-async-hooks-context-manager
// Original: x$T
// Type: CJS (RT wrapper)
// Exports: AbstractAsyncHooksContextManager
// Category: util

// Module: x$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.AbstractAsyncHooksContextManager = void 0));
  var R = qT("events"),
    a = ["addListener", "on", "once", "prependListener", "prependOnceListener"];
  class e {
    bind(t, r) {
      if (r instanceof R.EventEmitter) return this._bindEventEmitter(t, r);
      if (typeof r === "function") return this._bindFunction(t, r);
      return r;
    }
    _bindFunction(t, r) {
      let h = this,
        i = function (...c) {
          return h.with(t, () => r.apply(this, c));
        };
      return (
        Object.defineProperty(i, "length", {
          enumerable: !1,
          configurable: !0,
          writable: !1,
          value: r.length,
        }),
        i
      );
    }
    _bindEventEmitter(t, r) {
      if (this._getPatchMap(r) !== void 0) return r;
      if (
        (this._createPatchMap(r),
        a.forEach((h) => {
          if (r[h] === void 0) return;
          r[h] = this._patchAddListener(r, r[h], t);
        }),
        typeof r.removeListener === "function")
      )
        r.removeListener = this._patchRemoveListener(r, r.removeListener);
      if (typeof r.off === "function")
        r.off = this._patchRemoveListener(r, r.off);
      if (typeof r.removeAllListeners === "function")
        r.removeAllListeners = this._patchRemoveAllListeners(
          r,
          r.removeAllListeners,
        );
      return r;
    }
    _patchRemoveListener(t, r) {
      let h = this;
      return function (i, c) {
        let s = h._getPatchMap(t)?.[i];
        if (s === void 0) return r.call(this, i, c);
        let A = s.get(c);
        return r.call(this, i, A || c);
      };
    }
    _patchRemoveAllListeners(t, r) {
      let h = this;
      return function (i) {
        let c = h._getPatchMap(t);
        if (c !== void 0) {
          if (arguments.length === 0) h._createPatchMap(t);
          else if (c[i] !== void 0) delete c[i];
        }
        return r.apply(this, arguments);
      };
    }
    _patchAddListener(t, r, h) {
      let i = this;
      return function (c, s) {
        if (i._wrapped) return r.call(this, c, s);
        let A = i._getPatchMap(t);
        if (A === void 0) A = i._createPatchMap(t);
        let l = A[c];
        if (l === void 0) ((l = new WeakMap()), (A[c] = l));
        let o = i.bind(h, s);
        (l.set(s, o), (i._wrapped = !0));
        try {
          return r.call(this, c, o);
        } finally {
          i._wrapped = !1;
        }
      };
    }
    _createPatchMap(t) {
      let r = Object.create(null);
      return ((t[this._kOtListeners] = r), r);
    }
    _getPatchMap(t) {
      return t[this._kOtListeners];
    }
    _kOtListeners = Symbol("OtListeners");
    _wrapped = !1;
  }
  T.AbstractAsyncHooksContextManager = e;
};
