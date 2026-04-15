function Pz0(T) {
  if (typeof T !== "object" || T === null) return !1;
  return typeof Reflect.get(T, "url") === "string";
}
function kz0(T) {
  if (typeof T !== "object" || T === null) return !1;
  return typeof Reflect.get(T, "error") === "string";
}
function xz0(T) {
  try {
    let R = new URL(T);
    if (R.protocol !== "http:" && R.protocol !== "https:") return !1;
    let a = R.hostname.toLowerCase();
    return a === "localhost" || a === "127.0.0.1" || a === "::1" || a.endsWith(".localhost");
  } catch {
    return !1;
  }
}