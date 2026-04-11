// Module: get-error-code
// Original: jZ
// Type: CJS (RT wrapper)
// Exports: getErrorCode, getErrorMessage
// Category: util

// Module: jZ (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getErrorMessage = R),
    (T.getErrorCode = a));
  function R(e) {
    if (e instanceof Error) return e.message;
    else return String(e);
  }
  function a(e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      typeof e.code === "number"
    )
      return e.code;
    else return null;
  }
};
