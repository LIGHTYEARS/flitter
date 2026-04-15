function ec(T) {
  if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
  var R = T[Symbol.asyncIterator],
    a;
  return R ? R.call(T) : (T = typeof FAT === "function" ? FAT(T) : T[Symbol.iterator](), a = {}, e("next"), e("throw"), e("return"), a[Symbol.asyncIterator] = function () {
    return this;
  }, a);
  function e(r) {
    a[r] = T[r] && function (h) {
      return new Promise(function (i, c) {
        h = T[r](h), t(i, c, h.done, h.value);
      });
    };
  }
  function t(r, h, i, c) {
    Promise.resolve(c).then(function (s) {
      r({
        value: s,
        done: i
      });
    }, h);
  }
}