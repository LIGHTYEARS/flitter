function VW0(T) {
  let R = T.toolUse.input ?? T.toolUse.normalizedInput,
    a = R?.url?.trim();
  if (!a) return;
  let e = `Read ${a}`,
    t = XW0(T.toolResult.run, R);
  return {
    kind: "read",
    title: e,
    detail: t,
    status: T.toolResult.run.status
  };
}