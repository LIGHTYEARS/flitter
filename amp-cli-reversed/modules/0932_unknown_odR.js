function odR(T) {
  let R = Symbol.asyncIterator in T ? T[Symbol.asyncIterator]() : T[Symbol.iterator]();
  return x6T({
    start() {},
    async pull(a) {
      let {
        done: e,
        value: t
      } = await R.next();
      if (e) a.close();else a.enqueue(t);
    },
    async cancel() {
      var a;
      await ((a = R.return) === null || a === void 0 ? void 0 : a.call(R));
    }
  });
}