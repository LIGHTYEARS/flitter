function GER(T = $a) {
  if (typeof T.allowEmptyArrays < "u" && typeof T.allowEmptyArrays !== "boolean") throw TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  if (typeof T.encodeDotInKeys < "u" && typeof T.encodeDotInKeys !== "boolean") throw TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  if (T.encoder !== null && typeof T.encoder < "u" && typeof T.encoder !== "function") throw TypeError("Encoder has to be a function.");
  let R = T.charset || $a.charset;
  if (typeof T.charset < "u" && T.charset !== "utf-8" && T.charset !== "iso-8859-1") throw TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  let a = lNT;
  if (typeof T.format < "u") {
    if (!iV(hV, T.format)) throw TypeError("Unknown format option provided.");
    a = T.format;
  }
  let e = hV[a],
    t = $a.filter;
  if (typeof T.filter === "function" || yr(T.filter)) t = T.filter;
  let r;
  if (T.arrayFormat && T.arrayFormat in Q8T) r = T.arrayFormat;else if ("indices" in T) r = T.indices ? "indices" : "repeat";else r = $a.arrayFormat;
  if ("commaRoundTrip" in T && typeof T.commaRoundTrip !== "boolean") throw TypeError("`commaRoundTrip` must be a boolean, or absent");
  let h = typeof T.allowDots > "u" ? !!T.encodeDotInKeys === !0 ? !0 : $a.allowDots : !!T.allowDots;
  return {
    addQueryPrefix: typeof T.addQueryPrefix === "boolean" ? T.addQueryPrefix : $a.addQueryPrefix,
    allowDots: h,
    allowEmptyArrays: typeof T.allowEmptyArrays === "boolean" ? !!T.allowEmptyArrays : $a.allowEmptyArrays,
    arrayFormat: r,
    charset: R,
    charsetSentinel: typeof T.charsetSentinel === "boolean" ? T.charsetSentinel : $a.charsetSentinel,
    commaRoundTrip: !!T.commaRoundTrip,
    delimiter: typeof T.delimiter > "u" ? $a.delimiter : T.delimiter,
    encode: typeof T.encode === "boolean" ? T.encode : $a.encode,
    encodeDotInKeys: typeof T.encodeDotInKeys === "boolean" ? T.encodeDotInKeys : $a.encodeDotInKeys,
    encoder: typeof T.encoder === "function" ? T.encoder : $a.encoder,
    encodeValuesOnly: typeof T.encodeValuesOnly === "boolean" ? T.encodeValuesOnly : $a.encodeValuesOnly,
    filter: t,
    format: a,
    formatter: e,
    serializeDate: typeof T.serializeDate === "function" ? T.serializeDate : $a.serializeDate,
    skipNulls: typeof T.skipNulls === "boolean" ? T.skipNulls : $a.skipNulls,
    sort: typeof T.sort === "function" ? T.sort : null,
    strictNullHandling: typeof T.strictNullHandling === "boolean" ? T.strictNullHandling : $a.strictNullHandling
  };
}