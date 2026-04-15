function mPR(T, R) {
  let a = R.filter(e => e.type === "text").map(e => e.text.trim()).filter(e => e.length > 0);
  if (a.length > 0) return a.join(`

`);
  return `MCP tool "${T}" returned an error response without details.`;
}