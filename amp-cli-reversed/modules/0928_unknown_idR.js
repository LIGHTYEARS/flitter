function MK(T) {
  return typeof T === "object" && T !== null && ("name" in T && T.name === "AbortError" || "message" in T && String(T.message).includes("FetchRequestCanceledException"));
}
function rdR(T) {
  if (!T) return !0;
  for (let R in T) return !1;
  return !0;
}
function hdR(T, R) {
  return Object.prototype.hasOwnProperty.call(T, R);
}
function idR() {
  if (typeof Deno < "u" && Deno.build != null) return "deno";
  if (typeof EdgeRuntime < "u") return "edge";
  if (Object.prototype.toString.call(typeof globalThis.process < "u" ? globalThis.process : 0) === "[object process]") return "node";
  return "unknown";
}