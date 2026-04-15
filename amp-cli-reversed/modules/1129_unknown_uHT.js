function ub(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_readableStreamController") && T instanceof me;
}
function Ok(T) {
  return T._reader !== void 0;
}
function uHT(T, R) {
  if (T._disturbed = !0, T._state === "closed") return E8(void 0);
  if (T._state === "errored") return m9(T._storedError);
  iv(T);
  let a = T._reader;
  if (a !== void 0 && tP(a)) {
    let e = a._readIntoRequests;
    a._readIntoRequests = new Dh(), e.forEach(t => {
      t._closeSteps(void 0);
    });
  }
  return hc(T._readableStreamController[eM](R), HUT);
}