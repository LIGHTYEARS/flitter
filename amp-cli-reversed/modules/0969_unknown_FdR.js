async function FdR(T, R, a) {
  var e;
  let t = await d6T(T, R, a),
    r = await (t === null || t === void 0 ? void 0 : t.json());
  if (((e = t === null || t === void 0 ? void 0 : t.headers) === null || e === void 0 ? void 0 : e[Yl]) !== "final") throw Error("Failed to upload file: Upload status is not finalized.");
  return r.file;
}