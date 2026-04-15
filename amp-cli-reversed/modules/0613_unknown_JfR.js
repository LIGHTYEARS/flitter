function JfR(T) {
  if (!T) return "";
  if (typeof T === "string") return T;
  if (Array.isArray(T) && T.length > 0 && typeof T[0] === "object") {
    let R = T[0];
    if ("tool_uses" in R || "message" in R) return TIR(T);
  }
  if (Array.isArray(T)) return T.join(`
`);
  if (typeof T === "object" && "output" in T && typeof T.output === "string") return T.output;
  return bb(T, "progress");
}