function b9(T, R, a, e, t) {
  if (e === "m") throw TypeError("Private method is not writable");
  if (e === "a" && !t) throw TypeError("Private accessor was defined without a setter");
  if (typeof R === "function" ? T !== R || !t : !R.has(T)) throw TypeError("Cannot write private member to an object whose class did not declare it");
  return e === "a" ? t.call(T, a) : t ? t.value = a : R.set(T, a), a;
}