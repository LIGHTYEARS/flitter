async function M4(T) {
  J.debug("Checking command existence", {
    command: T
  });
  let R = await fb(T, ["--version"]);
  if (R.reason === "success") return J.debug("Command found", {
    command: T,
    version: R.output
  }), !0;else return J.debug("Command not found or failed", {
    command: T,
    result: R
  }), !1;
}