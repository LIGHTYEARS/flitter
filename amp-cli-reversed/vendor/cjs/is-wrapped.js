// Module: is-wrapped
// Original: S$T
// Type: CJS (RT wrapper)
// Exports: isWrapped, safeExecuteInTheMiddle, safeExecuteInTheMiddleAsync
// Category: util

// Module: S$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.isWrapped =
      T.safeExecuteInTheMiddleAsync =
      T.safeExecuteInTheMiddle =
        void 0));
  function R(t, r, h) {
    let i, c;
    try {
      c = t();
    } catch (s) {
      i = s;
    } finally {
      if ((r(i, c), i && !h)) throw i;
      return c;
    }
  }
  T.safeExecuteInTheMiddle = R;
  async function a(t, r, h) {
    let i, c;
    try {
      c = await t();
    } catch (s) {
      i = s;
    } finally {
      if ((await r(i, c), i && !h)) throw i;
      return c;
    }
  }
  T.safeExecuteInTheMiddleAsync = a;
  function e(t) {
    return (
      typeof t === "function" &&
      typeof t.__original === "function" &&
      typeof t.__unwrap === "function" &&
      t.__wrapped === !0
    );
  }
  T.isWrapped = e;
};
