function Jp(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_ownerWritableStream") && T instanceof Uo;
}
function lHT(T, R) {
  T._readyPromiseState === "pending" ? bHT(T, R) : function (a, e) {
    tX(a, e);
  }(T, R);
}
function z5(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_controlledWritableStream") && T instanceof cv;
}
function z7(T) {
  T._writeAlgorithm = void 0, T._closeAlgorithm = void 0, T._abortAlgorithm = void 0, T._strategySizeAlgorithm = void 0;
}
function AHT(T) {
  return T._strategyHWM - T._queueTotalSize;
}
function $U(T) {
  let R = T._controlledWritableStream;
  if (!T._started) return;
  if (R._inFlightWriteRequest !== void 0) return;
  if (R._state === "erroring") return void w3T(R);
  if (T._queue.length === 0) return;
  let a = T._queue.peek().value;
  a === F3T ? function (e) {
    let t = e._controlledWritableStream;
    (function (h) {
      h._inFlightCloseRequest = h._closeRequest, h._closeRequest = void 0;
    })(t), TX(e);
    let r = e._closeAlgorithm();
    z7(e), ot(r, () => (function (h) {
      h._inFlightCloseRequest._resolve(void 0), h._inFlightCloseRequest = void 0, h._state === "erroring" && (h._storedError = void 0, h._pendingAbortRequest !== void 0 && (h._pendingAbortRequest._resolve(), h._pendingAbortRequest = void 0)), h._state = "closed";
      let i = h._writer;
      i !== void 0 && _HT(i);
    }(t), null), h => (function (i, c) {
      i._inFlightCloseRequest._reject(c), i._inFlightCloseRequest = void 0, i._pendingAbortRequest !== void 0 && (i._pendingAbortRequest._reject(c), i._pendingAbortRequest = void 0), eX(i, c);
    }(t, h), null));
  }(T) : function (e, t) {
    let r = e._controlledWritableStream;
    (function (h) {
      h._inFlightWriteRequest = h._writeRequests.shift();
    })(r), ot(e._writeAlgorithm(t), () => {
      (function (i) {
        i._inFlightWriteRequest._resolve(void 0), i._inFlightWriteRequest = void 0;
      })(r);
      let h = r._state;
      if (TX(e), !Ql(r) && h === "writable") {
        let i = N3T(e);
        B3T(r, i);
      }
      return $U(e), null;
    }, h => (r._state === "writable" && z7(e), function (i, c) {
      i._inFlightWriteRequest._reject(c), i._inFlightWriteRequest = void 0, eX(i, c);
    }(r, h), null));
  }(T, a);
}