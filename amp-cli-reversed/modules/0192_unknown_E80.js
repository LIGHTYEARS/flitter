function a80(T) {
  return {
    body: T80(T)
  };
}
function e80(T, R) {
  R80(T, R.body);
}
function t80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return e80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function r80(T) {
  let R = new A0(T, Se),
    a = a80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function h80(T) {
  return {
    args: E0(T)
  };
}
function i80(T, R) {
  C0(T, R.args);
}
function c80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return i80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function s80(T) {
  let R = new A0(T, Se),
    a = h80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function o80(T) {
  return {
    output: E0(T)
  };
}
function n80(T, R) {
  C0(T, R.output);
}
function l80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return n80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function A80(T) {
  let R = new A0(T, Se),
    a = o80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function p80(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: Z2T(T)
  };
}
function _80(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), J2T(T, R.metadata);
}
function b80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return _80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function m80(T) {
  let R = new A0(T, Se),
    a = p80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function u80(T) {
  return {
    actorId: KR(T)
  };
}
function y80(T, R) {
  YR(T, R.actorId);
}
function P80(T) {
  let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
  return y80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function k80(T) {
  let R = new A0(T, Se),
    a = u80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function x80(T) {
  return {
    actorId: KR(T),
    connectionId: KR(T)
  };
}
function f80(T, R) {
  YR(T, R.actorId), YR(T, R.connectionId);
}
function TGT(T) {
  return q0(T) ? E0(T) : null;
}
function RGT(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function I80(T) {
  return q0(T) ? UR(T) : null;
}
function g80(T, R) {
  if (z0(T, R !== null), R !== null) HR(T, R);
}
function $80(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: TGT(T),
    actionId: I80(T)
  };
}
function v80(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), RGT(T, R.metadata), g80(T, R.actionId);
}
function j80(T) {
  return {
    id: UR(T),
    output: E0(T)
  };
}
function S80(T, R) {
  HR(T, R.id), C0(T, R.output);
}
function O80(T) {
  return {
    name: KR(T),
    args: E0(T)
  };
}
function d80(T, R) {
  YR(T, R.name), C0(T, R.args);
}
function E80(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "Init",
        val: x80(T)
      };
    case 1:
      return {
        tag: "Error",
        val: $80(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: j80(T)
      };
    case 3:
      return {
        tag: "Event",
        val: O80(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}