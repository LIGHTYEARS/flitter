function sLR(T, R = {
  auto: !1
}) {
  if (gbT) throw Error(`you must \`import '@cerebras/cerebras_cloud_sdk/shims/${T.kind}'\` before importing anything else from @cerebras/cerebras_cloud_sdk`);
  if (tv) throw Error(`can't \`import '@cerebras/cerebras_cloud_sdk/shims/${T.kind}'\` after \`import '@cerebras/cerebras_cloud_sdk/shims/${tv}'\``);
  gbT = R.auto, tv = T.kind, DUT = T.fetch, oLR = T.Request, nLR = T.Response, lLR = T.Headers, ALR = T.FormData, pLR = T.Blob, YV = T.File, wUT = T.ReadableStream, _LR = T.getMultipartRequestOptions, BUT = T.getDefaultAgent, NUT = T.fileFromPath, bLR = T.isFsReadStream;
}