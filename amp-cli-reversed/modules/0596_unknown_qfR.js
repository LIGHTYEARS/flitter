function qfR(T) {
  return Boolean(T && typeof T === "object" && "isImage" in T && T.isImage && "imageInfo" in T && T.imageInfo && typeof T.imageInfo === "object" && "mimeType" in T.imageInfo && typeof T.imageInfo.mimeType === "string" && fN(T.imageInfo.mimeType) && "size" in T.imageInfo && typeof T.imageInfo.size === "number");
}