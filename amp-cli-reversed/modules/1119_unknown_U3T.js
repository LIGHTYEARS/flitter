function BbT(T, R) {
  T._controlledWritableStream._state === "writable" && pHT(T, R);
}
function N3T(T) {
  return AHT(T) <= 0;
}
function pHT(T, R) {
  let a = T._controlledWritableStream;
  z7(T), D3T(a, R);
}
function BC(T) {
  return TypeError(`WritableStream.prototype.${T} can only be used on a WritableStream`);
}
function F5(T) {
  return TypeError(`WritableStreamDefaultController.prototype.${T} can only be used on a WritableStreamDefaultController`);
}
function T_(T) {
  return TypeError(`WritableStreamDefaultWriter.prototype.${T} can only be used on a WritableStreamDefaultWriter`);
}
function OI(T) {
  return TypeError("Cannot " + T + " a stream using a released writer");
}
function JL(T) {
  T._closedPromise = zt((R, a) => {
    T._closedPromise_resolve = R, T._closedPromise_reject = a, T._closedPromiseState = "pending";
  });
}
function NbT(T, R) {
  JL(T), U3T(T, R);
}
function U3T(T, R) {
  T._closedPromise_reject !== void 0 && (vk(T._closedPromise), T._closedPromise_reject(R), T._closedPromise_resolve = void 0, T._closedPromise_reject = void 0, T._closedPromiseState = "rejected");
}