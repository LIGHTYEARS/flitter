function Kp0(T, R) {
  let a = J1(R, T.messageId),
    e = J1(R, T.truncateToMessageId);
  if (a < 0 || e < 0) throw Error("Unable to apply edit: message mapping not found");
  let t = R[a];
  if (!t || t.role !== "user") throw Error("Unable to apply edit: target message is not editable");
  let r = {
      role: "user",
      content: T.content,
      agentMode: T.agentMode,
      messageId: t.messageId,
      dtwMessageID: T.messageId
    },
    h = R.slice(0, e + 1);
  return h[a] = r, h;
}