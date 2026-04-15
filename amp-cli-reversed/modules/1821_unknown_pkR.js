function pkR(T, R) {
  let a = R.fsPath;
  if (T.startsWith("**/") || ["*", "**", "/*", "/**", "", "/"].includes(T) || T.includes("__dangerous_glob_canary__")) return `Ignoring glob pattern "${T}" in ${a}, because it may cause performance issues.`;
  return null;
}