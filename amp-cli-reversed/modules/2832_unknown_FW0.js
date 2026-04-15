function FW0(T, R) {
  if (!R || typeof R !== "object") return;
  let a = R;
  switch (T) {
    case "Bash":
      return typeof a.cmd === "string" ? a.cmd : void 0;
    case "Read":
      return typeof a.path === "string" ? a.path : void 0;
    case "Grep":
      return typeof a.pattern === "string" ? a.pattern : void 0;
    case "glob":
      return typeof a.filePattern === "string" ? a.filePattern : void 0;
    default:
      return;
  }
}