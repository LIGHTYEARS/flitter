function zCR(T) {
  return T === "commentary" || T === "final_answer";
}
function FCR(T) {
  if (typeof T !== "object" || T === null || !("phase" in T)) return;
  let R = T.phase;
  return zCR(R) ? R : void 0;
}
function GCR(T, R) {
  if (T.status === "cancelled" && T.progress) return `The user cancelled the tool so it is no longer running. Progress until cancelation:
${YCR(T.progress)}
--- Tool was cancelled and is no longer running
`;
  if (T.status !== "done") return B7(T, R);
  let a = T.result;
  if (typeof a === "object" && a !== null && "isImage" in a && a.isImage === !0 && "content" in a && typeof a.content === "string") {
    let t = a.content,
      r = a.imageInfo ?? {
        mimeType: "image/png",
        size: Math.round(t.length * 0.75)
      };
    return [{
      type: "input_text",
      text: `Image: ${a.absolutePath ?? "unknown"}`
    }, {
      type: "input_image",
      detail: "auto",
      image_url: `data:${r.mimeType};base64,${t}`
    }];
  }
  let e = KCR(a);
  if (e) return e;
  return B7(T, R);
}