function dXT(T) {
  if (T.length === 0) return T;
  if (T.startsWith("Live sync")) return T;
  return `${T[0].toUpperCase()}${T.slice(1)}`;
}
function BP0(T) {
  let R = T.toLowerCase();
  return R.startsWith("git status unavailable") || R.includes("head changed") || R.startsWith("staying on ");
}
function NP0(T) {
  let R = T.toLowerCase();
  return R.startsWith("transport error:") || R.startsWith("executor error:") || R.startsWith("couldn't request an executor reconnect automatically:");
}
function FxT(T) {
  let R = T.toLowerCase();
  return R.startsWith("updated ") || R.startsWith("removed ");
}
function UP0(T, R) {
  if (!RA(R) || T.startsWith("\u2713 ")) return T;
  return `\u2713 ${T}`;
}
function HP0(T) {
  let R = T.toLowerCase();
  return R.includes("(y)es") || R.includes("(n)o") || R.includes("[y/n]") || R.includes("press enter");
}
function WP0(T) {
  let R = T.toLowerCase();
  return R.startsWith("waiting to reconnect") || R.startsWith("waiting for the executor filesystem") || R.startsWith("stopping live sync");
}
function qP0(T) {
  let R = zP0(T.toLowerCase());
  return R.startsWith("connecting...") || R.startsWith("clearing local changes") || R.startsWith("fetching ") || R.startsWith("switching to ") || R.startsWith("updating...") || R.startsWith("removing...") || R.startsWith("syncing...");
}