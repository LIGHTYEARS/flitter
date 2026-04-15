function c5R(T) {
  let R = T.message.toLowerCase(),
    a = T.error?.message?.toLowerCase() ?? "";
  return T.status === 429 || T.error?.type === "rate_limit_error" || R.includes("429") || a.includes("429") || R.includes("resource_exhausted") || a.includes("resource_exhausted") || R.includes("resource exhausted") || a.includes("resource exhausted") || R.includes("rate limit") || a.includes("rate limit") || R.includes("too many requests") || a.includes("too many requests");
}