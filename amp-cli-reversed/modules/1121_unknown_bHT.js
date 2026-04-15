function vU(T) {
  T._readyPromise = zt((R, a) => {
    T._readyPromise_resolve = R, T._readyPromise_reject = a;
  }), T._readyPromiseState = "pending";
}
function tX(T, R) {
  vU(T), bHT(T, R);
}
function UbT(T) {
  vU(T), H3T(T);
}
function bHT(T, R) {
  T._readyPromise_reject !== void 0 && (vk(T._readyPromise), T._readyPromise_reject(R), T._readyPromise_resolve = void 0, T._readyPromise_reject = void 0, T._readyPromiseState = "rejected");
}