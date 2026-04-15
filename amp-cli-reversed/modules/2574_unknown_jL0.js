function XM(T) {
  if (T >= 1e6) return `${Math.round(T / 1e6)}M`;
  if (T >= 1000) return `${Math.round(T / 1000)}k`;
  return T.toString();
}
function vL0(T) {
  if (!T) return "";
  let R = T.split("-");
  if (R.length >= 2) return R.slice(0, 2).join("-");
  return T;
}
function jL0(T) {
  let R = [],
    a = (T.inputTokens ?? 0) + (T.cacheCreationInputTokens ?? 0),
    e = T.cacheReadInputTokens ?? 0;
  if (a > 0) R.push(`${XM(a)} in`);
  if (e > 0) R.push(`${XM(e)} cache read`);
  if (T.outputTokens) R.push(`${XM(T.outputTokens)} out`);
  if (T.model) R.push(vL0(T.model));
  if (R.length > 0) return `(${R.join(", ")})`;
  return "";
}