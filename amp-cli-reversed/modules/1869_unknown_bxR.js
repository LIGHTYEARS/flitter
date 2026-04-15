function bxR(T) {
  let R = ["## Assistant"];
  if (T.state.type === "streaming") R.push("*(streaming)*");else if (T.state.type === "cancelled") R.push("*(cancelled)*");else if (T.state.type === "error") R.push(`*(error: ${T.state.error.message})*`);
  for (let a of T.content) switch (a.type) {
    case "text":
      R.push(r8T(a, !0));
      break;
    case "thinking":
      break;
    case "redacted_thinking":
      break;
    case "tool_use":
      R.push(kxR(a));
      break;
  }
  return R.join(`

`);
}