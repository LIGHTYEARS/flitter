function bR(T, R, a, e) {
  if (a === "a" && !e) throw TypeError("Private accessor was defined without a getter");
  if (typeof R === "function" ? T !== R || !e : !R.has(T)) throw TypeError("Cannot read private member from an object whose class did not declare it");
  return a === "m" ? e : a === "a" ? e.call(T) : e ? e.value : R.get(T);
}