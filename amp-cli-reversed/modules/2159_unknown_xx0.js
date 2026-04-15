function xx0(T) {
  if (T.status !== "done" || !Array.isArray(T.result)) return;
  let R = [];
  for (let a of T.result) {
    if (a.type !== "image" || typeof a.data !== "string" || typeof a.mimeType !== "string") continue;
    R.push({
      mimeType: a.mimeType,
      data: a.data,
      savedPath: typeof a.savedPath === "string" ? a.savedPath : void 0
    });
  }
  if (R.length === 0) return;
  return {
    images: R
  };
}