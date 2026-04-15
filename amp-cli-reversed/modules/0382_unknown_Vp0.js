function Vp0(T) {
  if (T.type === "queued_messages") return {
    type: "queued_messages",
    messages: T.messages.map(R => GkT(R))
  };
  if (T.type === "queued_message_added") return {
    type: "queued_message_added",
    message: GkT(T.message)
  };
  return {
    type: "queued_message_removed",
    queuedMessageId: T.queuedMessageId
  };
}