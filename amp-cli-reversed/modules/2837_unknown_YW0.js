function YW0(T) {
  let R = T.toolUse.input ?? T.toolUse.normalizedInput,
    a = R?.threadID?.trim();
  if (!a) return;
  let e = R?.goal?.trim(),
    t = e ? `Read thread ${a}: ${e}` : `Read thread ${a}`,
    r = QW0(T.toolResult.run, R);
  return {
    kind: "read",
    title: t,
    detail: r,
    status: T.toolResult.run.status
  };
}