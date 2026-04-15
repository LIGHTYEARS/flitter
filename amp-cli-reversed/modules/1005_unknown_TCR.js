async function* TCR(T, R) {
  if (!T.body) {
    if (R.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative") throw new Y0("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api");
    throw new Y0("Attempted to iterate over a response with no body");
  }
  let a = new yNT(),
    e = new Vj(),
    t = nNT(T.body);
  for await (let r of RCR(t)) for (let h of e.decode(r)) {
    let i = a.decode(h);
    if (i) yield i;
  }
  for (let r of e.flush()) {
    let h = a.decode(r);
    if (h) yield h;
  }
}