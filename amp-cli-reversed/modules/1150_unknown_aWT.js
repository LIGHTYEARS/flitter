function iDR(T, R) {
  let a = T.indexOf(R);
  if (a !== -1) return [T.substring(0, a), R, T.substring(a + R.length)];
  return [T, "", ""];
}
function aWT(T) {
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