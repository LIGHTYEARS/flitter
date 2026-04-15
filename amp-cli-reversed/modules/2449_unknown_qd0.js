function Wd0(T, R, a) {
  return {
    type: "image",
    source: {
      type: "base64",
      mediaType: R,
      data: a.toString("base64")
    },
    sourcePath: T
  };
}
function GQT(T) {
  return {
    image: Wd0(T.filePath, T.mediaType, T.data),
    filePath: T.filePath,
    fileSizeBytes: T.data.length,
    mediaType: T.mediaType,
    originURL: T.originURL
  };
}
async function qd0(T) {
  let R = await zQT(T),
    a = FQT(R, null, void 0, T);
  if (!a) throw Error("Unsupported image format");
  let e = XA({
    source: {
      type: "file",
      path: T,
      data: R
    }
  });
  if (e !== null) throw Error(e);
  return GQT({
    data: R,
    filePath: T,
    mediaType: a
  });
}