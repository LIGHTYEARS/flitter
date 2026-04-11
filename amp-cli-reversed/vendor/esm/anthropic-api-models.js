// Module: anthropic-api-models
// Original: HlT
// Type: ESM (PT wrapper)
// Exports: a, tK
// Category: npm-pkg

// Module: HlT (ESM)
() => {
  (En(),
    Mi(),
    XN(),
    zj(),
    gm(),
    (tK = class extends Li {
      list(R = {}, a) {
        let { betas: e, ...t } = R ?? {};
        return this._client.getAPIList("/v1/files", Sx, {
          query: t,
          ...a,
          headers: i8([
            {
              "anthropic-beta": [
                ...(e ?? []),
                "files-api-2025-04-14",
              ].toString(),
            },
            a?.headers,
          ]),
        });
      }
      delete(R, a = {}, e) {
        let { betas: t } = a ?? {};
        return this._client.delete(xe`/v1/files/${R}`, {
          ...e,
          headers: i8([
            {
              "anthropic-beta": [
                ...(t ?? []),
                "files-api-2025-04-14",
              ].toString(),
            },
            e?.headers,
          ]),
        });
      }
      download(R, a = {}, e) {
        let { betas: t } = a ?? {};
        return this._client.get(xe`/v1/files/${R}/content`, {
          ...e,
          headers: i8([
            {
              "anthropic-beta": [
                ...(t ?? []),
                "files-api-2025-04-14",
              ].toString(),
              Accept: "application/binary",
            },
            e?.headers,
          ]),
          __binaryResponse: !0,
        });
      }
      retrieveMetadata(R, a = {}, e) {
        let { betas: t } = a ?? {};
        return this._client.get(xe`/v1/files/${R}`, {
          ...e,
          headers: i8([
            {
              "anthropic-beta": [
                ...(t ?? []),
                "files-api-2025-04-14",
              ].toString(),
            },
            e?.headers,
          ]),
        });
      }
      upload(R, a) {
        let { betas: e, ...t } = R;
        return this._client.post(
          "/v1/files",
          A8T(
            {
              body: t,
              ...a,
              headers: i8([
                {
                  "anthropic-beta": [
                    ...(e ?? []),
                    "files-api-2025-04-14",
                  ].toString(),
                },
                efR(t.file),
                a?.headers,
              ]),
            },
            this._client,
          ),
        );
      }
    }));
};
