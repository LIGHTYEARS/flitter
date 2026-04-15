function TX(T) {
  let R = T._queue.shift();
  return T._queueTotalSize -= R.size, T._queueTotalSize < 0 && (T._queueTotalSize = 0), R.value;
}
function C3T(T, R, a) {
  if (typeof (e = a) != "number" || z3T(e) || e < 0 || a === 1 / 0) throw RangeError("Size must be a finite, non-NaN, non-negative number.");
  var e;
  T._queue.push({
    value: R,
    size: a
  }), T._queueTotalSize += a;
}