function i$(T) {
  if (!At(T)) return !1;
  if (typeof T.getReader != "function") return !1;
  try {
    return typeof T.locked == "boolean";
  } catch (R) {
    return !1;
  }
}
function XUT(T) {
  if (!At(T)) return !1;
  if (typeof T.getWriter != "function") return !1;
  try {
    return typeof T.locked == "boolean";
  } catch (R) {
    return !1;
  }
}
function YUT(T, R) {
  if (!ub(T)) throw TypeError(`${R} is not a ReadableStream.`);
}
function dbT(T, R) {
  T._reader._readRequests.push(R);
}
function JV(T, R, a) {
  let e = T._reader._readRequests.shift();
  a ? e._closeSteps() : e._chunkSteps(R);
}
function U7(T) {
  return T._reader._readRequests.length;
}
function QUT(T) {
  let R = T._reader;
  return R !== void 0 && !!J_(R);
}
class Ml {
  constructor(T) {
    if (mn(T, 1, "ReadableStreamDefaultReader"), YUT(T, "First parameter"), Ok(T)) throw TypeError("This stream has already been locked for exclusive reading by another reader");
    WUT(this, T), this._readRequests = new Dh();
  }
  get closed() {
    return J_(this) ? this._closedPromise : m9(MC("closed"));
  }
  cancel(T) {
    return J_(this) ? this._ownerReadableStream === void 0 ? m9(jk("cancel")) : qUT(this, T) : m9(MC("cancel"));
  }
  read() {
    if (!J_(this)) return m9(MC("read"));
    if (this._ownerReadableStream === void 0) return m9(jk("read from"));
    let T,
      R,
      a = zt((e, t) => {
        T = e, R = t;
      });
    return function (e, t) {
      let r = e._ownerReadableStream;
      r._disturbed = !0, r._state === "closed" ? t._closeSteps() : r._state === "errored" ? t._errorSteps(r._storedError) : r._readableStreamController[tM](t);
    }(this, {
      _chunkSteps: e => T({
        value: e,
        done: !1
      }),
      _closeSteps: () => T({
        value: void 0,
        done: !0
      }),
      _errorSteps: e => R(e)
    }), a;
  }
  releaseLock() {
    if (!J_(this)) throw MC("releaseLock");
    this._ownerReadableStream !== void 0 && function (T) {
      zUT(T);
      let R = TypeError("Reader was released");
      ZUT(T, R);
    }(this);
  }
}