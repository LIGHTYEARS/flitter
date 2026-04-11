// Module: websocket
// Original: GA
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: GA (CJS)
(T, R) => {
  var a = ["nodebuffer", "arraybuffer", "fragments"],
    e = typeof Blob < "u";
  if (e) a.push("blob");
  R.exports = {
    BINARY_TYPES: a,
    CLOSE_TIMEOUT: 30000,
    EMPTY_BUFFER: Buffer.alloc(0),
    GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
    hasBlob: e,
    kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
    kListener: Symbol("kListener"),
    kStatusCode: Symbol("status-code"),
    kWebSocket: Symbol("websocket"),
    NOOP: () => {},
  };
};
