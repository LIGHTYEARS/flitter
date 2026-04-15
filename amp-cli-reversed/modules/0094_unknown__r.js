function _r(T) {
  if (T instanceof Error) {
    if (typeof process < "u" && q1R()) return `${T.name}: ${T.message}${T.stack ? `
${T.stack}` : ""}`;else return `${T.name}: ${T.message}`;
  } else if (typeof T === "string") return T;else if (typeof T === "object" && T !== null) try {
    return `${JSON.stringify(T)}`;
  } catch {
    return "[cannot stringify error]";
  } else return `Unknown error: ${p$(T)}`;
}