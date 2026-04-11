// Module: http-client-4
// Original: pwT
// Type: ESM (PT wrapper)
// Exports: e, h5, i7, nAT
// Category: util

// Module: pwT (ESM)
() => {
  (Mi(),
    XN(),
    pfR(),
    lwT(),
    oAT(),
    oAT(),
    RwT(),
    (i7 = class extends Li {
      constructor() {
        super(...arguments);
        this.batches = new nK(this._client);
      }
      create(R, a) {
        if (R.model in h5)
          console.warn(`The model '${R.model}' is deprecated and will reach end-of-life on ${h5[R.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        if (R.model in nAT && R.thinking && R.thinking.type === "enabled")
          console.warn(
            `Using Claude with ${R.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`,
          );
        let e = this._client._options.timeout;
        if (!R.stream && e == null) {
          let r = _8T[R.model] ?? void 0;
          e = this._client.calculateNonstreamingTimeout(R.max_tokens, r);
        }
        let t = J7T(R.tools, R.messages);
        return this._client.post("/v1/messages", {
          body: R,
          timeout: e ?? 600000,
          ...a,
          headers: i8([t, a?.headers]),
          stream: R.stream ?? !1,
        });
      }
      parse(R, a) {
        return this.create(R, a).then((e) =>
          nwT(e, R, { logger: this._client.logger ?? console }),
        );
      }
      stream(R, a) {
        return AwT.createMessage(this, R, a, {
          logger: this._client.logger ?? console,
        });
      }
      countTokens(R, a) {
        return this._client.post("/v1/messages/count_tokens", {
          body: R,
          ...a,
        });
      }
    }),
    (h5 = {
      "claude-1.3": "November 6th, 2024",
      "claude-1.3-100k": "November 6th, 2024",
      "claude-instant-1.1": "November 6th, 2024",
      "claude-instant-1.1-100k": "November 6th, 2024",
      "claude-instant-1.2": "November 6th, 2024",
      "claude-3-sonnet-20240229": "July 21st, 2025",
      "claude-3-opus-20240229": "January 5th, 2026",
      "claude-2.1": "July 21st, 2025",
      "claude-2.0": "July 21st, 2025",
      "claude-3-7-sonnet-latest": "February 19th, 2026",
      "claude-3-7-sonnet-20250219": "February 19th, 2026",
      "claude-3-5-haiku-latest": "February 19th, 2026",
      "claude-3-5-haiku-20241022": "February 19th, 2026",
    }),
    (nAT = ["claude-opus-4-6"]),
    (i7.Batches = nK));
};
