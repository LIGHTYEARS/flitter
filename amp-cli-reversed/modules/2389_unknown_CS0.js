function CS0(T) {
  let R = T.split(".");
  if (R.length < 2 || R[R.length - 1] && (/_/.test(R[R.length - 1]) || !/[a-zA-Z\d]/.test(R[R.length - 1])) || R[R.length - 2] && (/_/.test(R[R.length - 2]) || !/[a-zA-Z\d]/.test(R[R.length - 2]))) return !1;
  return !0;
}