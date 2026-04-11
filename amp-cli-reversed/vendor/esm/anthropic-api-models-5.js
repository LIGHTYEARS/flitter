// Module: anthropic-api-models-5
// Original: aAT
// Type: ESM (PT wrapper)
// Exports: a, sK
// Category: npm-pkg

// Module: aAT (ESM)
() => {
  (En(),
    Mi(),
    zj(),
    gm(),
    (sK = class extends Li {
      create(R, a = {}, e) {
        let { betas: t, ...r } = a ?? {};
        return this._client.post(
          xe`/v1/skills/${R}/versions?beta=true`,
          A8T(
            {
              body: r,
              ...e,
              headers: i8([
                {
                  "anthropic-beta": [
                    ...(t ?? []),
                    "skills-2025-10-02",
                  ].toString(),
                },
                e?.headers,
              ]),
            },
            this._client,
          ),
        );
      }
      retrieve(R, a, e) {
        let { skill_id: t, betas: r } = a;
        return this._client.get(xe`/v1/skills/${t}/versions/${R}?beta=true`, {
          ...e,
          headers: i8([
            {
              "anthropic-beta": [...(r ?? []), "skills-2025-10-02"].toString(),
            },
            e?.headers,
          ]),
        });
      }
      list(R, a = {}, e) {
        let { betas: t, ...r } = a ?? {};
        return this._client.getAPIList(
          xe`/v1/skills/${R}/versions?beta=true`,
          l8T,
          {
            query: r,
            ...e,
            headers: i8([
              {
                "anthropic-beta": [
                  ...(t ?? []),
                  "skills-2025-10-02",
                ].toString(),
              },
              e?.headers,
            ]),
          },
        );
      }
      delete(R, a, e) {
        let { skill_id: t, betas: r } = a;
        return this._client.delete(
          xe`/v1/skills/${t}/versions/${R}?beta=true`,
          {
            ...e,
            headers: i8([
              {
                "anthropic-beta": [
                  ...(r ?? []),
                  "skills-2025-10-02",
                ].toString(),
              },
              e?.headers,
            ]),
          },
        );
      }
    }));
};
