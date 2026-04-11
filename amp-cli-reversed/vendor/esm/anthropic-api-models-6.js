// Module: anthropic-api-models-6
// Original: eAT
// Type: ESM (PT wrapper)
// Exports: a, h7
// Category: npm-pkg

// Module: eAT (ESM)
() => {
  (aAT(),
    aAT(),
    En(),
    Mi(),
    zj(),
    gm(),
    (h7 = class extends Li {
      constructor() {
        super(...arguments);
        this.versions = new sK(this._client);
      }
      create(R = {}, a) {
        let { betas: e, ...t } = R ?? {};
        return this._client.post(
          "/v1/skills?beta=true",
          A8T(
            {
              body: t,
              ...a,
              headers: i8([
                {
                  "anthropic-beta": [
                    ...(e ?? []),
                    "skills-2025-10-02",
                  ].toString(),
                },
                a?.headers,
              ]),
            },
            this._client,
            !1,
          ),
        );
      }
      retrieve(R, a = {}, e) {
        let { betas: t } = a ?? {};
        return this._client.get(xe`/v1/skills/${R}?beta=true`, {
          ...e,
          headers: i8([
            {
              "anthropic-beta": [...(t ?? []), "skills-2025-10-02"].toString(),
            },
            e?.headers,
          ]),
        });
      }
      list(R = {}, a) {
        let { betas: e, ...t } = R ?? {};
        return this._client.getAPIList("/v1/skills?beta=true", l8T, {
          query: t,
          ...a,
          headers: i8([
            {
              "anthropic-beta": [...(e ?? []), "skills-2025-10-02"].toString(),
            },
            a?.headers,
          ]),
        });
      }
      delete(R, a = {}, e) {
        let { betas: t } = a ?? {};
        return this._client.delete(xe`/v1/skills/${R}?beta=true`, {
          ...e,
          headers: i8([
            {
              "anthropic-beta": [...(t ?? []), "skills-2025-10-02"].toString(),
            },
            e?.headers,
          ]),
        });
      }
    }),
    (h7.Versions = sK));
};
