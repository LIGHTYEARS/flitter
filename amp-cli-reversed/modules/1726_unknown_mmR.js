function fN(T) {
  return CLT.includes(T);
}
function eG(T) {
  return LLT[T] ?? null;
}
function mmR(T) {
  try {
    let R = gLT(T);
    if (R.width && R.height && R.width > 0 && R.height > 0) return {
      width: R.width,
      height: R.height
    };
    return null;
  } catch {
    return null;
  }
}