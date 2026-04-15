function AIR(T) {
  if (T.status === "done") {
    if (T.result !== null && typeof T.result === "object" && "output" in T.result && typeof T.result.output === "string") {
      if ("truncation" in T.result && typeof T.result.truncation === "object" && T.result.truncation !== null && "prefixLinesOmitted" in T.result.truncation && typeof T.result.truncation.prefixLinesOmitted === "number") {
        let R = T.result.truncation.prefixLinesOmitted;
        return `--- Truncated ${R} ${o9(R, "line")} above this ---
` + T.result.output;
      }
      return T.result.output;
    }
  }
  return MwT.default.stringify(T);
}