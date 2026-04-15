function p4R(T) {
  if (!(T instanceof Error)) return !1;
  let R = T.message.toLowerCase();
  return R.includes("429") || R.includes("resource_exhausted") || R.includes("rate limit") || R.includes("too many requests") || R.includes("overloaded");
}