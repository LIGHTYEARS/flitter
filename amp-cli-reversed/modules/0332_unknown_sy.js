function QA0(T) {
  let R = !1;
  if (T.diff !== TA) T.diff = TA, R = !0;
  if (T.fullFileDiff !== void 0 && T.fullFileDiff !== TA) T.fullFileDiff = TA, R = !0;
  return R;
}
function sy(T) {
  let R = Buffer.from(JSON.stringify(T), "utf8").toString("base64"),
    a = new TextEncoder().encode(JSON.stringify({
      type: "executor_artifact_upsert",
      artifact: {
        key: Z3T,
        dataType: "application/json",
        contentBase64: R
      }
    })).length;
  return {
    contentBase64: R,
    messageSizeBytes: a
  };
}