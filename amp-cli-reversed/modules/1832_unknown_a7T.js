function a7T(T) {
  let R = T.toLowerCase();
  if (R.includes("/.config/") || R.includes("\\.config\\")) return "user's private global instructions for all projects";
  if (R.includes(".local.md") || R.includes("agents.local.md")) return "user's private project instructions, not checked in";
  return "project instructions";
}