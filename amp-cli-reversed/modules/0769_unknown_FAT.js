function FAT(T) {
  var R = typeof Symbol === "function" && Symbol.iterator,
    a = R && T[R],
    e = 0;
  if (a) return a.call(T);
  if (T && typeof T.length === "number") return {
    next: function () {
      if (T && e >= T.length) T = void 0;
      return {
        value: T && T[e++],
        done: !T
      };
    }
  };
  throw TypeError(R ? "Object is not iterable." : "Symbol.iterator is not defined.");
}