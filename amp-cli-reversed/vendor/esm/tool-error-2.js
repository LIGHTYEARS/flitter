// Module: tool-error-2
// Original: hK
// Type: ESM (PT wrapper)
// Exports: b8T
// Category: util

// Module: hK (ESM)
() => {
  b8T = class extends Error {
    constructor(R) {
      let a =
        typeof R === "string"
          ? R
          : R.map((e) => {
              if (e.type === "text") return e.text;
              return `[${e.type}]`;
            }).join(" ");
      super(a);
      ((this.name = "ToolError"), (this.content = R));
    }
  };
};
