function FbT(T) {
  return TypeError(`CountQueuingStrategy.prototype.${T} can only be used on a CountQueuingStrategy`);
}
function GbT(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_countQueuingStrategyHighWaterMark") && T instanceof G7;
}
function tMR(T, R, a) {
  return Mc(T, a), e => Em(T, R, [e]);
}
function rMR(T, R, a) {
  return Mc(T, a), e => gU(T, R, [e]);
}
function hMR(T, R, a) {
  return Mc(T, a), (e, t) => Em(T, R, [e, t]);
}
class K7 {
  constructor(T = {}, R = {}, a = {}) {
    T === void 0 && (T = null);
    let e = q7(R, "Second parameter"),
      t = q7(a, "Third parameter"),
      r = function (l, o) {
        hn(l, o);
        let n = l == null ? void 0 : l.flush,
          p = l == null ? void 0 : l.readableType,
          _ = l == null ? void 0 : l.start,
          m = l == null ? void 0 : l.transform,
          b = l == null ? void 0 : l.writableType;
        return {
          flush: n === void 0 ? void 0 : tMR(n, l, `${o} has member 'flush' that`),
          readableType: p,
          start: _ === void 0 ? void 0 : rMR(_, l, `${o} has member 'start' that`),
          transform: m === void 0 ? void 0 : hMR(m, l, `${o} has member 'transform' that`),
          writableType: b
        };
      }(T, "First parameter");
    if (r.readableType !== void 0) throw RangeError("Invalid readableType specified");
    if (r.writableType !== void 0) throw RangeError("Invalid writableType specified");
    let h = Yj(t, 0),
      i = W7(t),
      c = Yj(e, 1),
      s = W7(e),
      A;
    (function (l, o, n, p, _, m) {
      function b() {
        return o;
      }
      function y(f) {
        return function (v, g) {
          let I = v._transformStreamController;
          if (v._backpressure) return hc(v._backpressureChangePromise, () => {
            if ((Os(v._writable) ? v._writable._state : v._writableState) === "erroring") throw Os(v._writable) ? v._writable._storedError : v._writableStoredError;
            return VbT(I, g);
          });
          return VbT(I, g);
        }(l, f);
      }
      function u(f) {
        return function (v, g) {
          return V7(v, g), E8(void 0);
        }(l, f);
      }
      function P() {
        return function (f) {
          let v = f._transformStreamController,
            g = v._flushAlgorithm();
          return kHT(v), hc(g, () => {
            if (f._readableState === "errored") throw f._readableStoredError;
            Y7(f) && fHT(f);
          }, I => {
            throw V7(f, I), f._readableStoredError;
          });
        }(l);
      }
      function k() {
        return function (f) {
          return X7(f, !1), f._backpressureChangePromise;
        }(l);
      }
      function x(f) {
        return jU(l, f), E8(void 0);
      }
      l._writableState = "writable", l._writableStoredError = void 0, l._writableHasInFlightOperation = !1, l._writableStarted = !1, l._writable = function (f, v, g, I, S, O, j) {
        return new wl({
          start(d) {
            f._writableController = d;
            try {
              let C = d.signal;
              C !== void 0 && C.addEventListener("abort", () => {
                f._writableState === "writable" && (f._writableState = "erroring", C.reason && (f._writableStoredError = C.reason));
              });
            } catch (C) {}
            return hc(v(), () => (f._writableStarted = !0, YbT(f), null), C => {
              throw f._writableStarted = !0, G5(f, C), C;
            });
          },
          write: d => (function (C) {
            C._writableHasInFlightOperation = !0;
          }(f), hc(g(d), () => (function (C) {
            C._writableHasInFlightOperation = !1;
          }(f), YbT(f), null), C => {
            throw function (L, w) {
              L._writableHasInFlightOperation = !1, G5(L, w);
            }(f, C), C;
          })),
          close: () => (function (d) {
            d._writableHasInFlightOperation = !0;
          }(f), hc(I(), () => (function (d) {
            d._writableHasInFlightOperation = !1, d._writableState === "erroring" && (d._writableStoredError = void 0), d._writableState = "closed";
          }(f), null), d => {
            throw function (C, L) {
              C._writableHasInFlightOperation = !1, C._writableState, G5(C, L);
            }(f, d), d;
          })),
          abort: d => (f._writableState = "errored", f._writableStoredError = d, S(d))
        }, {
          highWaterMark: O,
          size: j
        });
      }(l, b, y, P, u, n, p), l._readableState = "readable", l._readableStoredError = void 0, l._readableCloseRequested = !1, l._readablePulling = !1, l._readable = function (f, v, g, I, S, O) {
        return new me({
          start: j => (f._readableController = j, v().catch(d => {
            Q7(f, d);
          })),
          pull: () => (f._readablePulling = !0, g().catch(j => {
            Q7(f, j);
          })),
          cancel: j => (f._readableState = "closed", I(j))
        }, {
          highWaterMark: S,
          size: O
        });
      }(l, b, k, x, _, m), l._backpressure = void 0, l._backpressureChangePromise = void 0, l._backpressureChangePromise_resolve = void 0, X7(l, !0), l._transformStreamController = void 0;
    })(this, zt(l => {
      A = l;
    }), c, s, h, i), function (l, o) {
      let n = Object.create(Bl.prototype),
        p,
        _;
      p = o.transform !== void 0 ? m => o.transform(m, n) : m => {
        try {
          return xHT(n, m), E8(void 0);
        } catch (b) {
          return m9(b);
        }
      }, _ = o.flush !== void 0 ? () => o.flush(n) : () => E8(void 0), function (m, b, y, u) {
        b._controlledTransformStream = m, m._transformStreamController = b, b._transformAlgorithm = y, b._flushAlgorithm = u;
      }(l, n, p, _);
    }(this, r), r.start !== void 0 ? A(r.start(this._transformStreamController)) : A(void 0);
  }
  get readable() {
    if (!KbT(this)) throw XbT("readable");
    return this._readable;
  }
  get writable() {
    if (!KbT(this)) throw XbT("writable");
    return this._writable;
  }
}