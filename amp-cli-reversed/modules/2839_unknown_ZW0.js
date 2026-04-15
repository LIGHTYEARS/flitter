function ZW0(T) {
  let R = T.toolUse.normalizedInput ?? T.toolUse.input;
  return {
    kind: "list",
    title: JW0(R),
    guidanceFiles: $b(T.toolResult.run),
    status: T.toolResult.run.status
  };
}