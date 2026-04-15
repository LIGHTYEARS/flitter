async function Q_(T, R) {
  try {
    return await Dq(T, R);
  } catch (a) {
    if (a instanceof Gg || a instanceof Vg) return await T.invalidateCredentials?.("all"), await Dq(T, R);else if (a instanceof Kg) return await T.invalidateCredentials?.("tokens"), await Dq(T, R);
    throw a;
  }
}