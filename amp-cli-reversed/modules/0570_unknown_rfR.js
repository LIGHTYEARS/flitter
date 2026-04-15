function rfR(T, R) {
  let a = awT(T);
  if (a?.type !== "json_schema") return null;
  try {
    if ("parse" in a) return a.parse(R);
    return JSON.parse(R);
  } catch (e) {
    throw new f9(`Failed to parse structured output: ${e}`);
  }
}