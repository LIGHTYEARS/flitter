function fn(T, R, a, e, t, r, h, i, c, s) {
  var A = this;
  if (yW.call(A), A.reader = T, A.reader.on("error", function (l) {
    W0R(A, l);
  }), A.reader.once("close", function () {
    A.emit("close");
  }), A.readEntryCursor = R, A.fileSize = a, A.entryCount = e, A.comment = t, A.entriesRead = 0, A.autoClose = !!r, A.lazyEntries = !!h, A.decodeStrings = !!i, A.validateEntrySizes = !!c, A.strictFileNames = !!s, A.isOpen = !0, A.emittedError = !1, !A.lazyEntries) A._readEntry();
}