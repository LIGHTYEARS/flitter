function Ql(T) {
  return T._closeRequest !== void 0 || T._inFlightCloseRequest !== void 0;
}
function wC(T) {
  T._closeRequest !== void 0 && (T._closeRequest._reject(T._storedError), T._closeRequest = void 0);
  let R = T._writer;
  R !== void 0 && U3T(R, T._storedError);
}
function B3T(T, R) {
  let a = T._writer;
  a !== void 0 && R !== T._backpressure && (R ? function (e) {
    vU(e);
  }(a) : H3T(a)), T._backpressure = R;
}
class Uo {
  constructor(T) {
    if (mn(T, 1, "WritableStreamDefaultWriter"), function (e, t) {
      if (!Os(e)) throw TypeError(`${t} is not a WritableStream.`);
    }(T, "First parameter"), ZL(T)) throw TypeError("This stream has already been locked for exclusive writing by another writer");
    this._ownerWritableStream = T, T._writer = this;
    let R = T._state;
    if (R === "writable") !Ql(T) && T._backpressure ? vU(this) : UbT(this), JL(this);else if (R === "erroring") tX(this, T._storedError), JL(this);else if (R === "closed") UbT(this), JL(a = this), _HT(a);else {
      let e = T._storedError;
      tX(this, e), NbT(this, e);
    }
    var a;
  }
  get closed() {
    return Jp(this) ? this._closedPromise : m9(T_("closed"));
  }
  get desiredSize() {
    if (!Jp(this)) throw T_("desiredSize");
    if (this._ownerWritableStream === void 0) throw OI("desiredSize");
    return function (T) {
      let R = T._ownerWritableStream,
        a = R._state;
      if (a === "errored" || a === "erroring") return null;
      if (a === "closed") return 0;
      return AHT(R._writableStreamController);
    }(this);
  }
  get ready() {
    return Jp(this) ? this._readyPromise : m9(T_("ready"));
  }
  abort(T) {
    return Jp(this) ? this._ownerWritableStream === void 0 ? m9(OI("abort")) : function (R, a) {
      return oHT(R._ownerWritableStream, a);
    }(this, T) : m9(T_("abort"));
  }
  close() {
    if (!Jp(this)) return m9(T_("close"));
    let T = this._ownerWritableStream;
    return T === void 0 ? m9(OI("close")) : Ql(T) ? m9(TypeError("Cannot close an already-closing stream")) : nHT(this._ownerWritableStream);
  }
  releaseLock() {
    if (!Jp(this)) throw T_("releaseLock");
    this._ownerWritableStream !== void 0 && function (T) {
      let R = T._ownerWritableStream,
        a = TypeError("Writer was released and can no longer be used to monitor the stream's closedness");
      lHT(T, a), function (e, t) {
        e._closedPromiseState === "pending" ? U3T(e, t) : function (r, h) {
          NbT(r, h);
        }(e, t);
      }(T, a), R._writer = void 0, T._ownerWritableStream = void 0;
    }(this);
  }
  write(T) {
    return Jp(this) ? this._ownerWritableStream === void 0 ? m9(OI("write to")) : function (R, a) {
      let e = R._ownerWritableStream,
        t = e._writableStreamController,
        r = function (c, s) {
          try {
            return c._strategySizeAlgorithm(s);
          } catch (A) {
            return BbT(c, A), 1;
          }
        }(t, a);
      if (e !== R._ownerWritableStream) return m9(OI("write to"));
      let h = e._state;
      if (h === "errored") return m9(e._storedError);
      if (Ql(e) || h === "closed") return m9(TypeError("The stream is closing or closed and cannot be written to"));
      if (h === "erroring") return m9(e._storedError);
      let i = function (c) {
        return zt((s, A) => {
          let l = {
            _resolve: s,
            _reject: A
          };
          c._writeRequests.push(l);
        });
      }(e);
      return function (c, s, A) {
        try {
          C3T(c, s, A);
        } catch (o) {
          return void BbT(c, o);
        }
        let l = c._controlledWritableStream;
        if (!Ql(l) && l._state === "writable") B3T(l, N3T(c));
        $U(c);
      }(t, a, r), i;
    }(this, T) : m9(T_("write"));
  }
}