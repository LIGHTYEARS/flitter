// Module: unknown-J0T
// Original: J0T
// Type: ESM (PT wrapper)
// Exports: JCT, R4T, T4T, Z0T
// Category: unknown

// Module: J0T (ESM)
() => {
  ((JCT = class extends Error {
    constructor(R = "Unauthorized") {
      super(R);
      this.name = "UnauthorizedError";
    }
  }),
    (T4T = class extends Error {
      constructor(R = "OAuth callback timeout") {
        super(R);
        this.name = "OAuthTimeoutError";
      }
    }),
    (R4T = class extends Error {
      serverName;
      constructor(R) {
        super(`OAuth flow skipped for "${R}"`);
        ((this.serverName = R), (this.name = "OAuthSkippedError"));
      }
    }),
    (Z0T = class extends Error {
      serverName;
      holderPid;
      constructor(R, a) {
        super(`OAuth flow already in progress for "${R}" (held by PID ${a})`);
        ((this.serverName = R),
          (this.holderPid = a),
          (this.name = "OAuthFlowInProgressError"));
      }
    }));
};
