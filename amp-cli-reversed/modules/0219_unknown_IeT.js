async function IeT(T) {
  g0().debug({
    msg: "sending http request",
    url: T.url,
    encoding: T.encoding
  });
  let R, a;
  if (T.method === "POST" || T.method === "PUT") Ut0.default(T.body !== void 0, "missing body"), R = S90(T.encoding), a = meT(T.encoding, T.body, T.requestVersionedDataHandler, T.requestVersion, T.requestZodSchema, T.requestToJson, T.requestToBare);
  let e;
  try {
    e = await (T.customFetch ?? fetch)(new globalThis.Request(T.url, {
      method: T.method,
      headers: {
        ...T.headers,
        ...(R ? {
          "Content-Type": R
        } : {}),
        "User-Agent": eYR()
      },
      body: a,
      credentials: "include",
      signal: T.signal
    }));
  } catch (t) {
    throw new p4(`Request failed: ${t}`, {
      cause: t
    });
  }
  if (!e.ok) {
    let t = await e.arrayBuffer(),
      r = e.headers.get("content-type"),
      h = e.headers.get("x-rivet-ray-id"),
      i = (r == null ? void 0 : r.includes("application/json")) ? "json" : T.encoding;
    try {
      let c = b1(i, new Uint8Array(t), ga0, Ua0, s => s, s => ({
        group: s.group,
        code: s.code,
        message: s.message,
        metadata: s.metadata ? kb(new Uint8Array(s.metadata)) : void 0
      }));
      throw new nh(c.group, c.code, c.message, c.metadata);
    } catch (c) {
      if (c instanceof nh) throw c;
      let s = new TextDecoder("utf-8", {
        fatal: !1
      }).decode(t);
      if (h) throw new p4(`${e.statusText} (${e.status}) (Ray ID: ${h}):
${s}`);else throw new p4(`${e.statusText} (${e.status}):
${s}`);
    }
  }
  if (T.skipParseResponse) return;
  try {
    let t = new Uint8Array(await e.arrayBuffer());
    return b1(T.encoding, t, T.responseVersionedDataHandler, T.responseZodSchema, T.responseFromJson, T.responseFromBare);
  } catch (t) {
    throw new p4(`Failed to parse response: ${t}`, {
      cause: t
    });
  }
}