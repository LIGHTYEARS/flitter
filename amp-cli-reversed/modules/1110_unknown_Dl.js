function q5(T) {
  return TypeError(`ReadableStreamBYOBRequest.prototype.${T} can only be used on a ReadableStreamBYOBRequest`);
}
function SI(T) {
  return TypeError(`ReadableByteStreamController.prototype.${T} can only be used on a ReadableByteStreamController`);
}
function wbT(T, R) {
  T._reader._readIntoRequests.push(R);
}
function cHT(T) {
  return T._reader._readIntoRequests.length;
}
function M3T(T) {
  let R = T._reader;
  return R !== void 0 && !!tP(R);
}
class Dl {
  constructor(T) {
    if (mn(T, 1, "ReadableStreamBYOBReader"), YUT(T, "First parameter"), Ok(T)) throw TypeError("This stream has already been locked for exclusive reading by another reader");
    if (!dy(T._readableStreamController)) throw TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
    WUT(this, T), this._readIntoRequests = new Dh();
  }
  get closed() {
    return tP(this) ? this._closedPromise : m9(DC("closed"));
  }
  cancel(T) {
    return tP(this) ? this._ownerReadableStream === void 0 ? m9(jk("cancel")) : qUT(this, T) : m9(DC("cancel"));
  }
  read(T) {
    if (!tP(this)) return m9(DC("read"));
    if (!ArrayBuffer.isView(T)) return m9(TypeError("view must be an array buffer view"));
    if (T.byteLength === 0) return m9(TypeError("view must have non-zero byteLength"));
    if (T.buffer.byteLength === 0) return m9(TypeError("view's buffer must have non-zero byteLength"));
    if (T.buffer, this._ownerReadableStream === void 0) return m9(jk("read from"));
    let R,
      a,
      e = zt((t, r) => {
        R = t, a = r;
      });
    return function (t, r, h) {
      let i = t._ownerReadableStream;
      i._disturbed = !0, i._state === "errored" ? h._errorSteps(i._storedError) : function (c, s, A) {
        let l = c._controlledReadableByteStream,
          o = 1;
        s.constructor !== DataView && (o = s.constructor.BYTES_PER_ELEMENT);
        let {
            constructor: n,
            buffer: p
          } = s,
          _ = {
            buffer: p,
            bufferByteLength: p.byteLength,
            byteOffset: s.byteOffset,
            byteLength: s.byteLength,
            bytesFilled: 0,
            elementSize: o,
            viewConstructor: n,
            readerType: "byob"
          };
        if (c._pendingPullIntos.length > 0) return c._pendingPullIntos.push(_), void wbT(l, A);
        if (l._state !== "closed") {
          if (c._queueTotalSize > 0) {
            if (tHT(c, _)) {
              let m = RHT(_);
              return hHT(c), void A._chunkSteps(m);
            }
            if (c._closeRequested) {
              let m = TypeError("Insufficient bytes to fill elements in the given buffer");
              return Sk(c, m), void A._errorSteps(m);
            }
          }
          c._pendingPullIntos.push(_), wbT(l, A), Hb(c);
        } else {
          let m = new n(_.buffer, _.byteOffset, 0);
          A._closeSteps(m);
        }
      }(i._readableStreamController, r, h);
    }(this, T, {
      _chunkSteps: t => R({
        value: t,
        done: !1
      }),
      _closeSteps: t => R({
        value: t,
        done: !0
      }),
      _errorSteps: t => a(t)
    }), e;
  }
  releaseLock() {
    if (!tP(this)) throw DC("releaseLock");
    this._ownerReadableStream !== void 0 && function (T) {
      zUT(T);
      let R = TypeError("Reader was released");
      sHT(T, R);
    }(this);
  }
}