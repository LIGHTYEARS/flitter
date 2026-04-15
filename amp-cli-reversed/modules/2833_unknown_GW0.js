function GW0(T) {
  let R = (T.toolUse.input ?? T.toolUse.normalizedInput)?.objective?.trim(),
    a = R ? `Search web: ${R}` : "Search web",
    e = KW0(T.toolResult.run);
  return {
    kind: "search",
    title: a,
    detail: e,
    status: T.toolResult.run.status
  };
}