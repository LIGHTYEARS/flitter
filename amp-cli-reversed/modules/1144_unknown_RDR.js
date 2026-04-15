function RDR() {
  if (typeof AbortController > "u") globalThis.AbortController = QHT.AbortController;
  return {
    kind: "node",
    fetch: s$.default,
    Request: s$.Request,
    Response: s$.Response,
    Headers: s$.Headers,
    FormData: BHT,
    Blob: dk,
    File: Ek,
    ReadableStream: ZMR,
    getMultipartRequestOptions: TDR,
    getDefaultAgent: T => T.startsWith("https") ? JHT : ZHT,
    fileFromPath: JMR,
    isFsReadStream: T => T instanceof YMR
  };
}