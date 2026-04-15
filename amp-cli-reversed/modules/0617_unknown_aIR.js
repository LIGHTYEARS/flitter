function aIR(T, R) {
  if (R?.stripGuidanceFiles && typeof T === "object" && T !== null) {
    if ("discoveredGuidanceFiles" in T) {
      let {
        discoveredGuidanceFiles: e,
        ...t
      } = T;
      T = t;
    }
  }
  if (qfR(T)) {
    let e = T.content ?? T.contentURL?.startsWith("data:"),
      t = T.content ?? T.contentURL?.replace(/^data:[^;,]*;base64,/, "") ?? "";
    if (e) {
      let r = ZN({
        type: "image",
        sourcePath: T.absolutePath,
        source: {
          type: "base64",
          mediaType: T.imageInfo.mimeType,
          data: t
        }
      });
      if (r) return [{
        type: "text",
        text: r
      }];
    }
    return [{
      type: "image",
      source: e ? {
        type: "base64",
        media_type: T.imageInfo.mimeType,
        data: t
      } : {
        type: "url",
        url: T.contentURL ?? ""
      }
    }];
  }
  function a(e) {
    if (typeof e === "object" && e !== null && "type" in e) {
      if (e.type === "text" && "text" in e && typeof e.text === "string") return !0;
      if (e.type === "image" && "source" in e) return !0;
    }
    return !1;
  }
  if (Array.isArray(T) && T.every(FfR)) return T.map(e => {
    if (e.type === "text") return {
      type: "text",
      text: e.text
    };else if (e.type === "image") return {
      type: "image",
      source: {
        type: "base64",
        data: e.data,
        media_type: e.mimeType
      }
    };else if (e.type === "resource" && "resource" in e) return {
      type: "text",
      text: bb(e.resource, "resource")
    };else if (e.type === "resource_link") return {
      type: "text",
      text: bb(e, "resource_link")
    };else if (e.type === "audio") return {
      type: "text",
      text: "[audio content]"
    };else return {
      type: "text",
      text: JSON.stringify(e)
    };
  });
  if (Array.isArray(T) && T.every(a)) return T;
  if (typeof T === "string") return [{
    type: "text",
    text: T
  }];
  if (Array.isArray(T) && T.every(e => typeof e === "string")) return [{
    type: "text",
    text: T.join(`
`)
  }];
  if (T === void 0) return [{
    type: "text",
    text: "undefined"
  }];
  if (T === null) return [{
    type: "text",
    text: "null"
  }];
  return [{
    type: "text",
    text: bb(T)
  }];
}