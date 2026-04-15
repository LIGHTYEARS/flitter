function oF(T) {
  let R = z9.safeParse(T.dtwMessageID);
  return R.success ? R.data : Vb();
}
function Mp0(T, R) {
  if (!T.usesDtw) return R ? "legacy-import-to-thread-actors" : "legacy-import-to-dtw";
  if (R && !T.usesThreadActors && T.executorType === "local-client") return "local-client-dtw-to-thread-actors";
  return "none";
}