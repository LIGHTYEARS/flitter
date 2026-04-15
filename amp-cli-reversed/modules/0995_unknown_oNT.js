function oNT(T) {
  let R = Symbol.asyncIterator in T ? T[Symbol.asyncIterator]() : T[Symbol.iterator]();
  return sNT({
    start() {},
    async pull(a) {
      let {
        done: e,
        value: t
      } = await R.next();
      if (e) a.close();else a.enqueue(t);
    },
    async cancel() {
      await R.return?.();
    }
  });
}