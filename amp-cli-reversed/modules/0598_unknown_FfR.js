function FfR(T) {
  return typeof T === "object" && T !== null && "type" in T && (T.type === "text" && "text" in T && typeof T.text === "string" || T.type === "image" && "data" in T && typeof T.data === "string" && "mimeType" in T && typeof T.mimeType === "string");
}