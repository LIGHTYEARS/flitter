function WUT(T, R) {
  T._ownerReadableStream = R, R._reader = T, R._state === "readable" ? QV(T) : R._state === "closed" ? function (a) {
    QV(a), GUT(a);
  }(T) : FUT(T, R._storedError);
}
function qUT(T, R) {
  return uHT(T._ownerReadableStream, R);
}
function zUT(T) {
  let R = T._ownerReadableStream;
  R._state === "readable" ? O3T(T, TypeError("Reader was released and can no longer be used to monitor the stream's closedness")) : function (a, e) {
    FUT(a, e);
  }(T, TypeError("Reader was released and can no longer be used to monitor the stream's closedness")), R._readableStreamController[rM](), R._reader = void 0, T._ownerReadableStream = void 0;
}