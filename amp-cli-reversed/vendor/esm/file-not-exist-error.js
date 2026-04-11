// Module: file-not-exist-error
// Original: Zt
// Type: ESM (PT wrapper)
// Exports: ur
// Category: util

// Module: Zt (ESM)
() => {
  ur = class extends Error {
    constructor(R) {
      let a = typeof R === "string" ? R : R.toString();
      super(`File not found: ${a}`);
      this.name = "FileNotExistError";
    }
  };
};
