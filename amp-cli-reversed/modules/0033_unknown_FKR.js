function BKR(T, R) {
  let a = new YzT(T),
    e = R ?? {},
    t = e.onClose;
  return e.onClose = async () => {
    if (await a.close(), t) return t();
  }, new waT(a, e);
}
function RFT(T, R) {
  let a = DKR(T),
    e = R ?? {},
    t = e.onClose;
  return e.onClose = async () => {
    if (await a.close(), t) return t();
  }, new waT(a, e);
}
function NKR(T, R) {
  return new JzT(T, R);
}
function UKR(T, R) {
  return new TFT(T, R);
}
async function WKR(T, R) {
  let a = BKR(T, R);
  if (T.path) {
    let e = await MKR(T.path);
    a.fileInfo.path = T.path, a.fileInfo.size = e.size;
  }
  return a;
}
function FKR(T, R = "utf-8") {
  switch (R.toLowerCase()) {
    case "utf-8":
    case "utf8":
      if (typeof globalThis.TextDecoder < "u") return new globalThis.TextDecoder("utf-8").decode(T);
      return GKR(T);
    case "utf-16le":
      return KKR(T);
    case "ascii":
      return VKR(T);
    case "latin1":
    case "iso-8859-1":
      return XKR(T);
    case "windows-1252":
      return YKR(T);
    default:
      throw RangeError(`Encoding '${R}' not supported`);
  }
}