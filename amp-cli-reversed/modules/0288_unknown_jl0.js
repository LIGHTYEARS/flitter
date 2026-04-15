function gl0(T, R) {
  let a = DKT(T, R);
  process.exit(a);
}
async function Jl(T, R) {
  let a = DKT(T, R);
  await xb(), process.exit(a);
}
function jl0(T, R) {
  switch (R.code) {
    case "auth-required":
      return "Authentication required to label threads";
    case "thread-not-found":
      return `Thread ${T} not found`;
    case "permission-denied":
      return `Permission denied to label thread ${T}`;
    case "rate-limit-exceeded":
      return "Rate limit exceeded while labeling thread";
    case "invalid-argument":
      return R.message ?? "Invalid labels";
    default:
      return R.message || `Failed to label thread ${T}`;
  }
}