function FLR(T, R) {
  return Mc(T, R), a => d3T(T(a));
}
function GLR(T, R, a) {
  return Mc(T, a), e => Em(T, R, [e]);
}
function KLR(T, R, a) {
  return Mc(T, a), () => Em(T, R, []);
}
function VLR(T, R, a) {
  return Mc(T, a), e => gU(T, R, [e]);
}
function XLR(T, R, a) {
  return Mc(T, a), (e, t) => Em(T, R, [e, t]);
}
class wl {
  constructor(T = {}, R = {}) {
    T === void 0 ? T = null : KUT(T, "First parameter");
    let a = q7(R, "Second parameter"),
      e = function (h, i) {
        hn(h, i);
        let c = h == null ? void 0 : h.abort,
          s = h == null ? void 0 : h.close,
          A = h == null ? void 0 : h.start,
          l = h == null ? void 0 : h.type,
          o = h == null ? void 0 : h.write;
        return {
          abort: c === void 0 ? void 0 : GLR(c, h, `${i} has member 'abort' that`),
          close: s === void 0 ? void 0 : KLR(s, h, `${i} has member 'close' that`),
          start: A === void 0 ? void 0 : VLR(A, h, `${i} has member 'start' that`),
          write: o === void 0 ? void 0 : XLR(o, h, `${i} has member 'write' that`),
          type: l
        };
      }(T, "First parameter");
    var t;
    if ((t = this)._state = "writable", t._storedError = void 0, t._writer = void 0, t._writableStreamController = void 0, t._writeRequests = new Dh(), t._inFlightWriteRequest = void 0, t._closeRequest = void 0, t._inFlightCloseRequest = void 0, t._pendingAbortRequest = void 0, t._backpressure = !1, e.type !== void 0) throw RangeError("Invalid type is specified");
    let r = W7(a);
    (function (h, i, c, s) {
      let A = Object.create(cv.prototype),
        l,
        o,
        n,
        p;
      l = i.start !== void 0 ? () => i.start(A) : () => {}, o = i.write !== void 0 ? _ => i.write(_, A) : () => E8(void 0), n = i.close !== void 0 ? () => i.close() : () => E8(void 0), p = i.abort !== void 0 ? _ => i.abort(_) : () => E8(void 0), function (_, m, b, y, u, P, k, x) {
        m._controlledWritableStream = _, _._writableStreamController = m, m._queue = void 0, m._queueTotalSize = void 0, lA(m), m._abortReason = void 0, m._abortController = function () {
          if (OHT) return new AbortController();
        }(), m._started = !1, m._strategySizeAlgorithm = x, m._strategyHWM = k, m._writeAlgorithm = y, m._closeAlgorithm = u, m._abortAlgorithm = P;
        let f = N3T(m);
        B3T(_, f);
        let v = b();
        ot(E8(v), () => (m._started = !0, $U(m), null), g => (m._started = !0, eX(_, g), null));
      }(h, A, l, o, n, p, c, s);
    })(this, e, Yj(a, 1), r);
  }
  get locked() {
    if (!Os(this)) throw BC("locked");
    return ZL(this);
  }
  abort(T) {
    return Os(this) ? ZL(this) ? m9(TypeError("Cannot abort a stream that already has a writer")) : oHT(this, T) : m9(BC("abort"));
  }
  close() {
    return Os(this) ? ZL(this) ? m9(TypeError("Cannot close a stream that already has a writer")) : Ql(this) ? m9(TypeError("Cannot close an already-closing stream")) : nHT(this) : m9(BC("close"));
  }
  getWriter() {
    if (!Os(this)) throw BC("getWriter");
    return new Uo(this);
  }
}