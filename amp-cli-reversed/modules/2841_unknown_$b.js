function $b(T) {
  if (T.status !== "done" || typeof T.result !== "object" || T.result === null) return;
  if (!("discoveredGuidanceFiles" in T.result)) return;
  if (!Array.isArray(T.result.discoveredGuidanceFiles)) return;
  return T.result.discoveredGuidanceFiles;
}