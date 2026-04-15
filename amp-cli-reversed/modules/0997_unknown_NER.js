async function NER(T) {
  if (T === null || typeof T !== "object") return;
  if (T[Symbol.asyncIterator]) {
    await T[Symbol.asyncIterator]().return?.();
    return;
  }
  let R = T.getReader(),
    a = R.cancel();
  R.releaseLock(), await a;
}