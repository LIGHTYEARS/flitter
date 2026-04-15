async function KQT(T) {
  if (T.source.type === "base64") {
    let e = Math.round(T.source.data.length * 3 / 4);
    return {
      image: T,
      filePath: T.sourcePath,
      fileSizeBytes: e,
      mediaType: T.source.mediaType
    };
  }
  let R = await zd0(T.source.url),
    a = await zQT(R.filePath);
  return GQT({
    data: a,
    filePath: R.filePath,
    mediaType: R.mediaType,
    originURL: T.source.url
  });
}