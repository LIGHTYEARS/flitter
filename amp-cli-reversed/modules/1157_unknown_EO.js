function Pb(T, ...R) {
  if (typeof process < "u" && process?.env?.DEBUG === "true") console.log(`Cerebras:DEBUG:${T}`, ...R);
}
class EO {
  constructor(T) {
    this._client = T;
  }
}