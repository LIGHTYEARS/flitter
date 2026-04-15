function Wp0(T, R, a, e) {
  if (!T || R.length === 0) return null;
  return {
    role: "assistant",
    content: R,
    state: {
      type: "streaming"
    },
    messageId: a,
    parentToolUseId: e
  };
}