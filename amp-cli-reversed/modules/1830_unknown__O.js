async function _O(T, R, a) {
  let [e, t] = await Promise.all([m0(kkR(T, AR.of({
    env: R.env
  })), a), m0(xkR(T, AR.of(R)), a)]);
  return a?.throwIfAborted(), (await ukR({
    filesystem: aET(T.filesystem) ? await m0(T.filesystem) : T.filesystem
  }, R7T([...e, ...t]), PkR(T.configService), T7T(R), a)).filter(r => !r.exclude);
}