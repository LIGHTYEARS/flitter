function qfT(T, R) {
  if (T) throw Error("Cannot close `" + T.type + "` (" + wv({
    start: T.start,
    end: T.end
  }) + "): a different token (`" + R.type + "`, " + wv({
    start: R.start,
    end: R.end
  }) + ") is open");else throw Error("Cannot close document, a token (`" + R.type + "`, " + wv({
    start: R.start,
    end: R.end
  }) + ") is still open");
}