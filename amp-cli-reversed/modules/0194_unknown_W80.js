function L80(T) {
  return {
    body: E80(T)
  };
}
function M80(T, R) {
  C80(T, R.body);
}
function D80(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return M80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function w80(T) {
  let R = new A0(T, Oe),
    a = L80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function B80(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function N80(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function U80(T) {
  return {
    eventName: KR(T),
    subscribe: q0(T)
  };
}
function H80(T, R) {
  YR(T, R.eventName), z0(T, R.subscribe);
}
function W80(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "ActionRequest",
        val: B80(T)
      };
    case 1:
      return {
        tag: "SubscriptionRequest",
        val: U80(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}