function kr(T) {
  return T.map(R => R.type === "text" ? R.text : null).filter(R => R !== null).join(`

`);
}
function wt(T) {
  return T === "done" || T === "error" || T === "rejected-by-user" || T === "cancelled";
}
function qlR(T) {
  return T.content.every(R => {
    return !(R.type === "tool_result" && !wt(R.run.status));
  });
}
function UET(T) {
  return T.role === "assistant" && T.state.type === "complete" && T.state.stopReason === "end_turn";
}
function dt(T, R) {
  return T.messages.findLast(a => a.role === R);
}
function pm(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a && "role" in a && a.role === "info") {
      for (let e of a.content) if (e.type === "summary" && e.summary.type === "message") return {
        summaryBlock: e,
        index: R
      };
    }
  }
  return;
}