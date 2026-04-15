function mGT(T) {
  async function R(a, e, t) {
    let r = (t == null ? void 0 : t.wait) ?? !1,
      h = t == null ? void 0 : t.timeout,
      i = await IeT({
        url: `http://actor/queue/${encodeURIComponent(a)}`,
        method: "POST",
        headers: {
          [V2T]: T.encoding,
          ...(T.params !== void 0 ? {
            [beT]: JSON.stringify(T.params)
          } : {})
        },
        body: {
          body: e,
          wait: r,
          timeout: h
        },
        encoding: T.encoding,
        customFetch: T.customFetch,
        signal: t == null ? void 0 : t.signal,
        requestVersion: Hk,
        requestVersionedDataHandler: fa0,
        responseVersion: Hk,
        responseVersionedDataHandler: Ia0,
        requestZodSchema: Ba0,
        responseZodSchema: Na0,
        requestToJson: c => ({
          ...c,
          name: a
        }),
        requestToBare: c => ({
          name: c.name ?? a,
          body: KU(Gb(c.body)),
          wait: c.wait ?? !1,
          timeout: c.timeout !== void 0 ? BigInt(c.timeout) : null
        }),
        responseFromJson: c => {
          if (c.response === void 0) return {
            status: c.status
          };
          return {
            status: c.status,
            response: c.response
          };
        },
        responseFromBare: c => {
          if (c.response === null || c.response === void 0) return {
            status: c.status
          };
          return {
            status: c.status,
            response: kb(new Uint8Array(c.response))
          };
        }
      });
    if (r) return i;
    return;
  }
  return {
    send: R
  };
}