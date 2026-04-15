function XU0(T) {
  return typeof T === "object" && T !== null && "label" in T && typeof T.label === "string" && "command" in T && typeof T.command === "string";
}
async function YU0(T, R) {
  if (!XU0(R)) return Error("Select a command from the picker");
  try {
    await d9.instance.tuiInstance.clipboard.writeText(R.command), T.showToast(`Copied: ${R.label}`, "success");
  } catch (a) {
    J.error("Failed to copy DTW debug command", {
      error: a
    });
  }
}