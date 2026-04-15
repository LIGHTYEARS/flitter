function k50(T) {
  let R = T.trim().split(`
`)[0]?.trim().toLowerCase() ?? "";
  if (/^sequencediagram\s*$/.test(R)) return "sequence";
  if (/^classdiagram\s*$/.test(R)) return "class";
  if (/^erdiagram\s*$/.test(R)) return "er";
  return "flowchart";
}