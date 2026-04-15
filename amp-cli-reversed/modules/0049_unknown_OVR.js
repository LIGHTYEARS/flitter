function OVR(T, R) {
  let a = R?.imageBlocks?.flatMap(e => {
    if (e.source.type === "base64") {
      let t = XA({
        source: {
          type: "base64",
          data: e.source.data ?? ""
        }
      });
      if (t) return [{
        type: "input_text",
        text: `Image omitted: ${t}`
      }];
    }
    return [{
      type: "input_image",
      detail: "auto",
      image_url: e.source.type === "base64" ? `data:${e.source.mediaType};base64,${e.source.data}` : e.source.url
    }];
  }) ?? [];
  return {
    input: [{
      type: "message",
      role: "user",
      content: [{
        type: "input_text",
        text: T
      }, ...a]
    }],
    reasoningEffort: R?.reasoningEffort ?? "medium"
  };
}