// Module: unknown-oyR
// Original: oyR
// Type: ESM (PT wrapper)
// Exports: w9T
// Category: unknown

// Module: oyR (ESM)
() => {
  w9T =
    globalThis.crypto?.webcrypto ??
    globalThis.crypto ??
    import("crypto").then((T) => T.webcrypto);
};
