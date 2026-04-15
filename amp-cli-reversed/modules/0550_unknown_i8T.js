function i8T(T) {
  if (T[Symbol.asyncIterator]) return T;
  let R = T.getReader();
  return {
    async next() {
      try {
        let a = await R.read();
        if (a?.done) R.releaseLock();
        return a;
      } catch (a) {
        throw R.releaseLock(), a;
      }
    },
    async return() {
      let a = R.cancel();
      return R.releaseLock(), await a, {
        done: !0,
        value: void 0
      };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}