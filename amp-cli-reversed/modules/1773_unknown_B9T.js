async function B9T(T, R, a = fetch) {
  try {
    return await a(T, {
      headers: R
    });
  } catch (e) {
    if (e instanceof TypeError) if (R) return B9T(T, void 0, a);else return;
    throw e;
  }
}