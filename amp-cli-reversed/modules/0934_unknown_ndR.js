async function ndR(T) {
  var R, a;
  if (T === null || typeof T !== "object") return;
  if (T[Symbol.asyncIterator]) {
    await ((a = (R = T[Symbol.asyncIterator]()).return) === null || a === void 0 ? void 0 : a.call(R));
    return;
  }
  let e = T.getReader(),
    t = e.cancel();
  e.releaseLock(), await t;
}