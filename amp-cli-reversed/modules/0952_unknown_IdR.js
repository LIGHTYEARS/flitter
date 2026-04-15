async function IdR(T, R) {
  var a, e, t;
  let r = z8T(T.file);
  if (r !== void 0) return await R.request({
    path: `files/${r}:download`,
    httpMethod: "GET",
    queryParams: {
      alt: "media"
    },
    httpOptions: (a = T.config) === null || a === void 0 ? void 0 : a.httpOptions,
    abortSignal: (e = T.config) === null || e === void 0 ? void 0 : e.abortSignal
  });else if (QBT(T.file)) {
    let h = (t = T.file.video) === null || t === void 0 ? void 0 : t.videoBytes;
    if (typeof h === "string") return h;else throw Error("Failed to download generated video, Uri or videoBytes not found.");
  } else if (ZBT(T.file)) {
    let h = T.file.videoBytes;
    if (typeof h === "string") return h;else throw Error("Failed to download video, Uri or videoBytes not found.");
  } else throw Error("Unsupported file type");
}