function XK(T) {
  return typeof T === "object" && T !== null && ("name" in T && T.name === "AbortError" || "message" in T && String(T.message).includes("FetchRequestCanceledException"));
}
function c_T(T) {
  if (typeof T !== "object") return {};
  return T ?? {};
}
function s_T(T) {
  if (!T) return !0;
  for (let R in T) return !1;
  return !0;
}
function SER(T, R) {
  return Object.prototype.hasOwnProperty.call(T, R);
}
function j5(T) {
  return T != null && typeof T === "object" && !Array.isArray(T);
}
function CER() {
  if (typeof Deno < "u" && Deno.build != null) return "deno";
  if (typeof EdgeRuntime < "u") return "edge";
  if (Object.prototype.toString.call(typeof globalThis.process < "u" ? globalThis.process : 0) === "[object process]") return "node";
  return "unknown";
}