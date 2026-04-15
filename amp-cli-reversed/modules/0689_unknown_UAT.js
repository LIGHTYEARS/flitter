function GBT(T) {
  if (Array.isArray(T)) return T.map(R => p7(R));else return [p7(T)];
}
function p7(T) {
  if (typeof T === "object" && T !== null) return T;
  throw Error(`Could not parse input as Blob. Unsupported blob type: ${typeof T}`);
}
function KBT(T) {
  let R = p7(T);
  if (R.mimeType && R.mimeType.startsWith("image/")) return R;
  throw Error(`Unsupported mime type: ${R.mimeType}`);
}
function VBT(T) {
  let R = p7(T);
  if (R.mimeType && R.mimeType.startsWith("audio/")) return R;
  throw Error(`Unsupported mime type: ${R.mimeType}`);
}
function UAT(T) {
  if (T === null || T === void 0) throw Error("PartUnion is required");
  if (typeof T === "object") return T;
  if (typeof T === "string") return {
    text: T
  };
  throw Error(`Unsupported part type: ${typeof T}`);
}