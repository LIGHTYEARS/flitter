function HG(T) {
  let R = JSON.parse(JSON.stringify(T));
  for (let a of e8T) if (a in R && typeof R[a] === "string") R[a] = nA(R[a]);
  return R;
}
function L7T(T) {
  let R = Lt(T, a => {
    let e = 0,
      t = 0;
    for (let r of a.messages) if (r.role === "user") {
      if (r.fileMentions) {
        if (r.fileMentions = void 0, e++, !r.content.some(h => h.type === "tool_result" || h.type === "image" || h.type === "text" && h.text.trim().length > 0)) r.content.push({
          type: "text",
          text: "(file mentions removed)"
        });
      }
      for (let h of r.content) if (h.type === "tool_result") {
        if (h.run.status === "done") {
          let i = h.run.result,
            c = a8T(h.run.result);
          if (i !== c) h.run.result = c, t++;
        } else if (h.run.status === "cancelled" && h.run.progress) h.run.progress = O8(lxR(h.run.progress));else if (h.run.status === "error" && h.run.error) {
          let i = h.run.error.message,
            c = nA(h.run.error.message);
          if (i !== c) h.run.error.message = c, t++;
        }
      }
    }
  });
  return J.debug("Truncated thread", {
    messages: R.messages
  }), R;
}