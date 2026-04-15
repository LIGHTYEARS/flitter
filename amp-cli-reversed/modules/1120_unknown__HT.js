function _HT(T) {
  T._closedPromise_resolve !== void 0 && (T._closedPromise_resolve(void 0), T._closedPromise_resolve = void 0, T._closedPromise_reject = void 0, T._closedPromiseState = "resolved");
}