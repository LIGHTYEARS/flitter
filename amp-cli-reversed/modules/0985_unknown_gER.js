function gER(T, R) {
  let a = [];
  if (T.fileMentions && T.fileMentions.files.length > 0) a.push({
    text: $m(T.fileMentions)
  });
  if (T.userState) a.push({
    text: Ox(T.userState)
  });
  for (let e of T.content) if (e.type === "text") a.push({
    text: e.text
  });else if (e.type === "image") {
    if (a.push({
      text: PO(e)
    }), e.source.type === "base64" && "mediaType" in e.source && "data" in e.source) a.push({
      inlineData: {
        mimeType: e.source.mediaType,
        data: e.source.data
      }
    });else if (e.source.type === "url" && "url" in e.source) a.push({
      text: `[Image URL: ${e.source.url}]`
    });
  } else if (e.type === "tool_result") {
    let t = {};
    if (e.run.status === "done") t.output = e.run.result;else if (e.run.status === "error") t.error = e.run.error?.message ?? "Error executing tool";else t.error = `Tool status: ${e.run.status}`;
    let r,
      [, h] = e.toolUseID.split("__");
    if (h) r = h;else for (let c of R.messages) if (c.role === "assistant") {
      for (let s of c.content) if (s.type === "tool_use" && s.id === e.toolUseID) {
        r = s.name;
        break;
      }
      if (r) break;
    }
    if (!r) throw Error(`Could not find tool name for tool_result with ID: ${e.toolUseID}`);
    let i = {
      name: r,
      response: t
    };
    a.push({
      functionResponse: i
    });
  }
  return a;
}