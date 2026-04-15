function MET(T) {
  return T.nextMessageId ?? T.messages.reduce((R, a) => Math.max(R, a.messageId), -1) + 1;
}
function DET(T, R) {
  return T.messages.findIndex(a => a.role === "user" && a.dtwMessageID === R);
}
function BlR(T, R) {
  let a = DET(T, R);
  if (a < 0) return;
  let e = T.messages[a];
  if (!e || e.role !== "user") return;
  return {
    index: a,
    message: e
  };
}
function wET(T, R) {
  if (T.length !== R.length) return !1;
  return T.every((a, e) => {
    let t = R[e];
    if (!t || a.type !== t.type) return !1;
    switch (a.type) {
      case "text":
        return t.type === "text" && a.text === t.text;
      case "image":
        {
          if (t.type !== "image") return !1;
          let r = t.source;
          if (a.source.type !== r.type) return !1;
          if (a.source.type === "base64") {
            if (r.type !== "base64") return !1;
            return a.source.mediaType === r.mediaType && a.source.data === r.data && a.sourcePath === t.sourcePath;
          }
          if (r.type !== "url") return !1;
          return a.source.url === r.url && a.sourcePath === t.sourcePath;
        }
      case "tool_result":
        return t.type === "tool_result" && a.toolUseID === t.toolUseID;
    }
  });
}