function x6T(...T) {
  let R = globalThis.ReadableStream;
  if (typeof R > "u") throw Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  return new R(...T);
}