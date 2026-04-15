function w3T(T) {
  T._state = "errored", T._writableStreamController[hX]();
  let R = T._storedError;
  if (T._writeRequests.forEach(e => {
    e._reject(R);
  }), T._writeRequests = new Dh(), T._pendingAbortRequest === void 0) return void wC(T);
  let a = T._pendingAbortRequest;
  if (T._pendingAbortRequest = void 0, a._wasAlreadyErroring) return a._reject(R), void wC(T);
  ot(T._writableStreamController[rX](a._reason), () => (a._resolve(), wC(T), null), e => (a._reject(e), wC(T), null));
}