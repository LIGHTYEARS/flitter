function RM0(T, R) {
  if (!T) return;
  let a = T[R];
  if (!a || typeof a !== "object") return;
  return a;
}
function aM0(T) {
  let R = new W0(),
    a = () => R.next();
  return process.once("SIGINT", a), T.pipe(M$(R), cET(e => {
    if (e.status === "error") throw Error(`Tool execution error: ${JSON.stringify(e.error)}`);else if (e.status === "rejected-by-user") throw Error("Tool execution was rejected by user");else if (e.status === "cancelled") throw Error("Tool execution was cancelled");
  }), tN(() => {
    process.off("SIGINT", a);
  }));
}