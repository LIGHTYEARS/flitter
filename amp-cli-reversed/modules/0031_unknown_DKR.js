function DKR(T) {
  try {
    let R = T.getReader({
      mode: "byob"
    });
    if (R instanceof ReadableStreamDefaultReader) return new zX(R);
    return new ZzT(R);
  } catch (R) {
    if (R instanceof TypeError) return new zX(T.getReader());
    throw R;
  }
}