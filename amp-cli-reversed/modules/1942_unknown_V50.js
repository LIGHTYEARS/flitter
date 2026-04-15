function V50(T) {
  let R = T.normalizedInput ?? T.input;
  if (!R || typeof R !== "object") return;
  if ("path" in R && typeof R.path === "string") return R.path;
  if ("filePattern" in R && typeof R.filePattern === "string") return R.filePattern;
  if ("pattern" in R && typeof R.pattern === "string") return R.pattern;
  if ("query" in R && typeof R.query === "string") return R.query;
  if ("url" in R && typeof R.url === "string") return R.url;
  if ("objective" in R && typeof R.objective === "string") return R.objective;
  if ("cmd" in R && typeof R.cmd === "string") return R.cmd;
  if ("command" in R && typeof R.command === "string") return R.command;
  if ("description" in R && typeof R.description === "string") return R.description;
  if ("prompt" in R && typeof R.prompt === "string") return R.prompt;
  return;
}