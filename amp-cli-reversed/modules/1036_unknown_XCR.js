function VCR(T) {
  return typeof T === "object" && T !== null && "type" in T && T.type === "text" && "text" in T && typeof T.text === "string";
}
function XCR(T) {
  return typeof T === "object" && T !== null && "type" in T && T.type === "image" && "mimeType" in T && typeof T.mimeType === "string" && "data" in T && typeof T.data === "string" && (!("savedPath" in T) || typeof T.savedPath === "string");
}