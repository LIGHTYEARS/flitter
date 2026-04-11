// Module: exec-async
// Original: lZ
// Type: CJS (RT wrapper)
// Exports: execAsync
// Category: util

// Module: lZ (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.execAsync = void 0));
  var R = qT("child_process"),
    a = qT("util");
  T.execAsync = a.promisify(R.exec);
};
