// Module: anthropic-api-models-4
// Original: _wT
// Type: ESM (PT wrapper)
// Exports: a, lK
// Category: npm-pkg

// Module: _wT (ESM)
() => {
  (En(),
    Mi(),
    gm(),
    (lK = class extends Li {
      retrieve(R, a = {}, e) {
        let { betas: t } = a ?? {};
        return this._client.get(xe`/v1/models/${R}`, {
          ...e,
          headers: i8([
            {
              ...(t?.toString() != null
                ? { "anthropic-beta": t?.toString() }
                : void 0),
            },
            e?.headers,
          ]),
        });
      }
      list(R = {}, a) {
        let { betas: e, ...t } = R ?? {};
        return this._client.getAPIList("/v1/models", Sx, {
          query: t,
          ...a,
          headers: i8([
            {
              ...(e?.toString() != null
                ? { "anthropic-beta": e?.toString() }
                : void 0),
            },
            a?.headers,
          ]),
        });
      }
    }));
};
