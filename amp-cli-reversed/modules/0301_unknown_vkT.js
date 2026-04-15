function $kT(T) {
  return T.filter(R => R.role === "assistant" && R.state.type !== "streaming").length;
}
function vkT(T) {
  if (T instanceof Error) if (v3T(T)) return "Unauthorized. Check your access token.";else if (dO(T)) return "Context window limit reached.";else if (fU(T)) return "Model provider overloaded. Try again in a few seconds.";else if (IU(T)) return "Model stream timed out. Try again in a few seconds.";else if ($3T(T)) return "Insufficient credit balance.";else return T.message;
  if (typeof T === "object" && T && "message" in T && typeof T.message === "string") return T.message;
  return String(T);
}