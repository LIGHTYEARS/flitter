function pdR(T) {
  if (typeof T !== "object" || T === null) return "";
  return `; props: [${Object.getOwnPropertyNames(T).map(R => `"${R}"`).join(", ")}]`;
}
class wK {
  constructor(T) {
    this._client = T;
  }
}