function $ER(T) {
  let R = [];
  for (let a of T) if (a.type === "text") R.push({
    text: a.text
  });else if (a.type === "tool_use") {
    let e = {
        functionCall: {
          name: a.name,
          args: a.input ?? {}
        }
      },
      t = a.metadata?.thoughtSignature;
    if (typeof t === "string") e.thoughtSignature = t;
    R.push(e);
  } else if (a.type === "thinking") R.push({
    text: a.thinking,
    thought: !0,
    thoughtSignature: a.signature
  });else if (a.type === "redacted_thinking") R.push({
    text: "[Redacted thinking]"
  });
  return R;
}