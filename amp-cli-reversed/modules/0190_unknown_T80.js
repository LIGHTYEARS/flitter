function G90(T) {
  return {
    body: z90(T)
  };
}
function K90(T, R) {
  F90(T, R.body);
}
function V90(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return K90(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function X90(T) {
  let R = new A0(T, Se),
    a = G90(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Y90(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function Q90(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function Z90(T) {
  return {
    eventName: KR(T),
    subscribe: q0(T)
  };
}
function J90(T, R) {
  YR(T, R.eventName), z0(T, R.subscribe);
}
function T80(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "ActionRequest",
        val: Y90(T)
      };
    case 1:
      return {
        tag: "SubscriptionRequest",
        val: Z90(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}