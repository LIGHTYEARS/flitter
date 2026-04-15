function xM0(T) {
  return T === tt || T === ja || T === uc || T === Dt || T === _L;
}
function fM0(T) {
  return T.content.filter(R => R.type === "text");
}
function IM0(T) {
  return T.type === "text" && T.text.trim().length > 0 || T.type === "thinking" && Xm(T);
}
function gM0(T) {
  if (T.meta?.openAIResponsePhase === "commentary") return;
  switch (T.state.type) {
    case "error":
      return;
    case "cancelled":
      {
        let R = fM0(T);
        if (kr(R).trim().length === 0) return;
        return {
          ...T,
          content: R
        };
      }
    case "streaming":
    case "complete":
      {
        let R = T.content.filter(IM0);
        if (R.length === 0) return;
        return {
          ...T,
          content: R
        };
      }
  }
}