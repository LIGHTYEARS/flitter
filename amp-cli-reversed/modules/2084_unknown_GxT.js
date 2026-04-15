function GxT(T, R) {
  switch (R.type) {
    case "delta":
      T.onDelta(R.message);
      return;
    case "message_added":
      T.onMessageAdded(R.message);
      return;
    case "tool_progress":
      T.onToolProgress(R.message);
      return;
    case "agent_state":
      T.onAgentStates(R.message);
      return;
    case "queued_message_added":
    case "queued_message_removed":
    case "queued_messages":
      T.onQueuedMessages(R.message);
      return;
    case "thread_title":
      T.onTitle(R.message);
      return;
    case "error_notice":
      T.onErrorNotice(R.message);
      return;
    case "active_error_set":
    case "active_error_cleared":
      T.onActiveErrorState(R.message);
      return;
    default:
      return;
  }
}