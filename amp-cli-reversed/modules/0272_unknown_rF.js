function rF(T) {
  switch (T.type) {
    case "queued_messages":
      return {
        type: "queued_messages",
        message: T
      };
    case "queued_message_added":
      return {
        type: "queued_message_added",
        message: T
      };
    case "queued_message_removed":
      return {
        type: "queued_message_removed",
        message: T
      };
  }
}