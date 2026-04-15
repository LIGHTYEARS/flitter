function Y9R(T, R) {
  if (T.status !== "done" || typeof T.result !== "object" || T.result === null) return [];
  if (!("discoveredGuidanceFiles" in T.result)) return [];
  if (!Array.isArray(T.result.discoveredGuidanceFiles)) return [];
  return T.result.discoveredGuidanceFiles.map(a => new G(`  Loaded ${ZA(a.uri)} (${a.lineCount} lines)
`, new cT({
    color: R.app.toolSuccess,
    dim: !0
  })));
}