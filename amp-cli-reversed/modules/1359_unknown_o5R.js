function o5R(T) {
  if (typeof T === "string") return T;
  if (typeof T === "object" && T !== null && "message" in T && typeof T.message === "string") return T.message;
  return JSON.stringify(T) ?? String(T);
}