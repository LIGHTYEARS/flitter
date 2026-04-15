function DzT(T) {
  let R = T.baseRevision ?? "",
    a = T.rawDiff ?? "",
    e = T.structuredDiff ?? RS(a),
    t = n2R(T.coreExplanations ?? [], e),
    r = T.remainingHunks ?? HX(e, t);
  return {
    baseRevision: R,
    rawDiff: a,
    structuredDiff: e,
    coreExplanations: t,
    remainingHunks: r
  };
}