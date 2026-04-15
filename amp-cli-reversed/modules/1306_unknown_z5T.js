function IWR(T) {
  switch (T) {
    case "running":
      return "in-progress";
    case "pending":
      return "queued";
    default:
      return T;
  }
}
function z5T(T) {
  if (T.tool === U8) {
    let R = T.input;
    if (R && typeof R.cmd === "string") return {
      command: R.cmd,
      dir: R.cwd
    };
  }
  if (T.tool === "shell_command") {
    let R = T.input,
      a = q5T(R);
    if (a.cmd) return {
      command: a.cmd,
      dir: a.cwd
    };
  }
  return null;
}