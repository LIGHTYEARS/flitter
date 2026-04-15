function ZOR(T, R) {
  let a = null,
    e = T.bidiGenerateContentSetup;
  if (typeof e === "object" && e !== null && "setup" in e) {
    let r = e.setup;
    if (typeof r === "object" && r !== null) T.bidiGenerateContentSetup = r, a = r;else delete T.bidiGenerateContentSetup;
  } else if (e !== void 0) delete T.bidiGenerateContentSetup;
  let t = T.fieldMask;
  if (a) {
    let r = QOR(a);
    if (Array.isArray(R === null || R === void 0 ? void 0 : R.lockAdditionalFields) && (R === null || R === void 0 ? void 0 : R.lockAdditionalFields.length) === 0) {
      if (r) T.fieldMask = r;else delete T.fieldMask;
    } else if ((R === null || R === void 0 ? void 0 : R.lockAdditionalFields) && R.lockAdditionalFields.length > 0 && t !== null && Array.isArray(t) && t.length > 0) {
      let h = ["temperature", "topK", "topP", "maxOutputTokens", "responseModalities", "seed", "speechConfig"],
        i = [];
      if (t.length > 0) i = t.map(s => {
        if (h.includes(s)) return `generationConfig.${s}`;
        return s;
      });
      let c = [];
      if (r) c.push(r);
      if (i.length > 0) c.push(...i);
      if (c.length > 0) T.fieldMask = c.join(",");else delete T.fieldMask;
    } else delete T.fieldMask;
  } else if (t !== null && Array.isArray(t) && t.length > 0) T.fieldMask = t.join(",");else delete T.fieldMask;
  return T;
}