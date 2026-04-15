function x30(T) {
  return {
    body: P30(T)
  };
}
function f30(T, R) {
  k30(T, R.body);
}
function I30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return f30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function g30(T) {
  let R = new A0(T, W3),
    a = x30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function $30(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function v30(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function j30(T) {
  return {
    eventName: KR(T),
    subscribe: q0(T)
  };
}
function S30(T, R) {
  YR(T, R.eventName), z0(T, R.subscribe);
}
function O30(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "ActionRequest",
        val: $30(T)
      };
    case 1:
      return {
        tag: "SubscriptionRequest",
        val: j30(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}