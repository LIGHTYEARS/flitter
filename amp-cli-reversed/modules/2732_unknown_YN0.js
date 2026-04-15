function YN0(T) {
  let R = yB(T);
  switch (R.type) {
    case "none":
      return null;
    case "simple":
      return R.message;
    case "executing":
      return `Executing /${R.command}...`;
    case "executing-message":
      return R.message;
    case "context-warning":
      return `${R.prefix} Use thread:handoff or thread:new to continue in a new thread.`;
  }
}