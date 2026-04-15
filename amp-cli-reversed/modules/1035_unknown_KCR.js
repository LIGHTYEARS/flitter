function KCR(T) {
  if (!Array.isArray(T) || T.length === 0) return null;
  let R = !1,
    a = [];
  for (let e of T) {
    if (VCR(e)) {
      a.push({
        type: "input_text",
        text: e.text
      });
      continue;
    }
    if (XCR(e)) {
      if (R = !0, e.savedPath) a.push({
        type: "input_text",
        text: `Generated image: ${e.savedPath}`
      });
      a.push({
        type: "input_image",
        detail: "auto",
        image_url: `data:${e.mimeType};base64,${e.data}`
      });
      continue;
    }
    return null;
  }
  return R ? a : null;
}