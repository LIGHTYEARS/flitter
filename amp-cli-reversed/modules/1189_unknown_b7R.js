function b7R(T) {
  if (T.action.type === "redact-tool-input" && T.on.event !== "tool:post-execute") return "redact-tool-input action can only be used with tool:post-execute event";
  if (T.action.type === "send-user-message" && T.on.event !== "tool:pre-execute") return "send-user-message action can only be used with tool:pre-execute event";
  return null;
}