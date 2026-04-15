function xwT(T, R, a) {
  let e,
    t = gj(T, R);
  if (t) {
    let h = t.messageIndex;
    for (let i = h + 1; i < T.messages.length; i++) {
      let c = T.messages[i];
      if (c?.role === "user") {
        e = c;
        break;
      }
    }
  }
  if (!e) e = {
    role: "user",
    messageId: $y(T),
    content: []
  }, T.messages.push(e);
  let r = cN(T, R);
  if (r) r.run = O8(a);else r = {
    type: "tool_result",
    toolUseID: R,
    run: O8(a)
  }, e.content.push(r);
}