async function* zxR(T, R) {
  if (!T.body) {
    if (R.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative") throw new f9("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api");
    throw new f9("Attempted to iterate over a response with no body");
  }
  let a = new W7T(),
    e = new Pk(),
    t = i8T(T.body);
  for await (let r of FxR(t)) for (let h of e.decode(r)) {
    let i = a.decode(h);
    if (i) yield i;
  }
  for (let r of e.flush()) {
    let h = a.decode(r);
    if (h) yield h;
  }
}