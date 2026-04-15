function _WR(T) {
  if (!T) throw Error("tool requires a working directory");
  if (T.scheme !== "file") throw Error(`tool requires a dir with a file: URI (got ${JSON.stringify(T.scheme)})`);
}
function q5T(T) {
  return {
    cmd: typeof T.command === "string" ? T.command : "",
    cwd: typeof T.workdir === "string" ? T.workdir : void 0,
    timeout_ms: typeof T.timeout_ms === "number" ? T.timeout_ms : void 0
  };
}