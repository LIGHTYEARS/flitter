function jOR(T, R) {
  if (!R || Object.keys(R).length === 0) return;
  if (T.body instanceof Blob) {
    console.warn("includeExtraBodyToRequestInit: extraBody provided but current request body is a Blob. extraBody will be ignored as merging is not supported for Blob bodies.");
    return;
  }
  let a = {};
  if (typeof T.body === "string" && T.body.length > 0) try {
    let r = JSON.parse(T.body);
    if (typeof r === "object" && r !== null && !Array.isArray(r)) a = r;else {
      console.warn("includeExtraBodyToRequestInit: Original request body is valid JSON but not a non-array object. Skip applying extraBody to the request body.");
      return;
    }
  } catch (r) {
    console.warn("includeExtraBodyToRequestInit: Original request body is not valid JSON. Skip applying extraBody to the request body.");
    return;
  }
  function e(r, h) {
    let i = Object.assign({}, r);
    for (let c in h) if (Object.prototype.hasOwnProperty.call(h, c)) {
      let s = h[c],
        A = i[c];
      if (s && typeof s === "object" && !Array.isArray(s) && A && typeof A === "object" && !Array.isArray(A)) i[c] = e(A, s);else {
        if (A && s && typeof A !== typeof s) console.warn(`includeExtraBodyToRequestInit:deepMerge: Type mismatch for key "${c}". Original type: ${typeof A}, New type: ${typeof s}. Overwriting.`);
        i[c] = s;
      }
    }
    return i;
  }
  let t = e(a, R);
  T.body = JSON.stringify(t);
}