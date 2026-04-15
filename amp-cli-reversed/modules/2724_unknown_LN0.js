function LN0(T) {
  let {
    event: R
  } = T;
  if (!(R.key === "Enter" && !R.shiftKey && !R.ctrlKey && !R.altKey && !R.metaKey) || !T.promptFocused) return "ignore";
  if (T.isSubmittingPromptMessage && T.currentSubmitQueuesBehindActiveTurn) return "interrupt-after-submit";
  if (T.promptText.trim() !== "" || T.hasImageAttachments) return "ignore";
  return T.canInterruptQueuedInference ? "interrupt-now" : "ignore";
}