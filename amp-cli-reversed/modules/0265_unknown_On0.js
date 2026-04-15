function On0(T, R, a) {
  let e = gn0(R),
    t = (() => {
      let s = In0(T);
      if (s.length === 0) return null;
      return Y1(s, a?.payloadPreviewMaxChars ?? 1200);
    })(),
    r;
  try {
    r = JSON.parse(T);
  } catch {
    let s = vKT(e);
    return {
      failureType: "invalid_json",
      summary: s ? `malformed JSON: ${s}` : "malformed JSON",
      messageType: null,
      typePreview: null,
      payloadPreview: t,
      issues: e
    };
  }
  if (!r || typeof r !== "object" || Array.isArray(r)) return {
    failureType: "invalid_shape",
    summary: "expected a JSON object payload",
    messageType: null,
    typePreview: null,
    payloadPreview: t,
    issues: e
  };
  let h = r;
  if (!Object.hasOwn(h, "type")) return {
    failureType: "missing_type",
    summary: 'missing string "type"',
    messageType: null,
    typePreview: null,
    payloadPreview: t,
    issues: e
  };
  let i = h.type,
    c = $n0(i);
  if (typeof i !== "string") return {
    failureType: "invalid_type",
    summary: `expected string "type", got ${c ?? "unknown value"}`,
    messageType: null,
    typePreview: c,
    payloadPreview: t,
    issues: e
  };
  if (jn0(e)) return {
    failureType: "unknown_type",
    summary: `unsupported type ${JSON.stringify(i)} (likely protocol version mismatch)`,
    messageType: i,
    typePreview: c,
    payloadPreview: t,
    issues: e
  };
  return {
    failureType: "invalid_shape",
    summary: Sn0(i, e),
    messageType: i,
    typePreview: c,
    payloadPreview: t,
    issues: e
  };
}