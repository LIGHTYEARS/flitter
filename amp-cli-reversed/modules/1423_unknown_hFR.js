function RFR(T) {
  if (typeof T !== "string") return "`cmd` must be a string representing a command.";
  return;
}
async function hFR(T, R) {
  let a = await eN(R.toolService.invokeTool(U8, {
    args: {
      cmd: T
    }
  }, R));
  if (a.status === "error") return {
    error: `Command failed: ${a.error?.message ?? "Bash command failed"}`
  };
  if (a.status !== "done") return {
    error: `Command did not complete (status: ${a.status})`
  };
  let e = a.result;
  if (!e) return {
    error: "Command produced no output"
  };
  if (e.exitCode !== void 0 && e.exitCode !== 0) return {
    error: `Command exited with code ${e.exitCode}: ${e.output ?? "(no output)"}`
  };
  let t = e.output;
  if (!t || t.trim().length === 0) return {
    error: "Command produced no output"
  };
  return {
    output: t
  };
}