// Module: unknown-rET
// Original: rET
// Type: ESM (PT wrapper)
// Exports: aN
// Category: unknown

// Module: rET (ESM)
() => {
  aN = {
    now: () => Date.now(),
    schedule: (T, R) => {
      let a = setTimeout(T, R);
      return () => clearTimeout(a);
    },
  };
};
