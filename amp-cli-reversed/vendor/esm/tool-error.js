// Module: tool-error
// Original: RAT
// Type: ESM (PT wrapper)
// Exports: T5, TAT, Zy, h
// Category: util

// Module: RAT (ESM)
() => {
  (mO(),
    RwT(),
    Mi(),
    XN(),
    twT(),
    sfR(),
    QlT(),
    hK(),
    ZlT(),
    ZlT(),
    QlT(),
    hK(),
    (T5 = {
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
    }),
    (TAT = ["claude-opus-4-6"]),
    (Zy = class extends Li {
      constructor() {
        super(...arguments);
        this.batches = new cK(this._client);
      }
      create(R, a) {
        let e = JlT(R),
          { betas: t, ...r } = e;
        if (r.model in T5)
          console.warn(`The model '${r.model}' is deprecated and will reach end-of-life on ${T5[r.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
        if (r.model in TAT && r.thinking && r.thinking.type === "enabled")
          console.warn(
            `Using Claude with ${r.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`,
          );
        let h = this._client._options.timeout;
        if (!r.stream && h == null) {
          let c = _8T[r.model] ?? void 0;
          h = this._client.calculateNonstreamingTimeout(r.max_tokens, c);
        }
        let i = J7T(r.tools, r.messages);
        return this._client.post("/v1/messages?beta=true", {
          body: r,
          timeout: h ?? 600000,
          ...a,
          headers: i8([
            {
              ...(t?.toString() != null
                ? { "anthropic-beta": t?.toString() }
                : void 0),
            },
            i,
            a?.headers,
          ]),
          stream: e.stream ?? !1,
        });
      }
      parse(R, a) {
        return (
          (a = {
            ...a,
            headers: i8([
              {
                "anthropic-beta": [
                  ...(R.betas ?? []),
                  "structured-outputs-2025-12-15",
                ].toString(),
              },
              a?.headers,
            ]),
          }),
          this.create(R, a).then((e) =>
            ewT(e, R, { logger: this._client.logger ?? console }),
          )
        );
      }
      stream(R, a) {
        return hwT.createMessage(this, R, a);
      }
      countTokens(R, a) {
        let e = JlT(R),
          { betas: t, ...r } = e;
        return this._client.post("/v1/messages/count_tokens?beta=true", {
          body: r,
          ...a,
          headers: i8([
            {
              "anthropic-beta": [
                ...(t ?? []),
                "token-counting-2024-11-01",
              ].toString(),
            },
            a?.headers,
          ]),
        });
      }
      toolRunner(R, a) {
        return new iK(this._client, R, a);
      }
    }),
    (Zy.Batches = cK),
    (Zy.BetaToolRunner = iK),
    (Zy.ToolError = b8T));
};
