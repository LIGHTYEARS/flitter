function hCR(T) {
  if (typeof T !== "object" || T === null) return "";
  return `; props: [${Object.getOwnPropertyNames(T).map(R => `"${R}"`).join(", ")}]`;
}
class w0 {
  constructor(T) {
    this._client = T;
  }
}