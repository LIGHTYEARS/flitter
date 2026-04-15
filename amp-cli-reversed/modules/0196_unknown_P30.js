function z80(T) {
  return {
    body: W80(T)
  };
}
function F80(T, R) {
  q80(T, R.body);
}
function G80(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return F80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function K80(T) {
  let R = new A0(T, Oe),
    a = z80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function V80(T) {
  return {
    args: E0(T)
  };
}
function X80(T, R) {
  C0(T, R.args);
}
function Y80(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return X80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function Q80(T) {
  let R = new A0(T, Oe),
    a = V80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Z80(T) {
  return {
    output: E0(T)
  };
}
function J80(T, R) {
  C0(T, R.output);
}
function T30(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return J80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function R30(T) {
  let R = new A0(T, Oe),
    a = Z80(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function a30(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: TGT(T)
  };
}
function e30(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), RGT(T, R.metadata);
}
function t30(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return e30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function r30(T) {
  let R = new A0(T, Oe),
    a = a30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function h30(T) {
  return {
    actorId: KR(T)
  };
}
function i30(T, R) {
  YR(T, R.actorId);
}
function c30(T) {
  let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
  return i30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function s30(T) {
  let R = new A0(T, Oe),
    a = h30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function o30(T) {
  return {
    actorId: KR(T),
    connectionId: KR(T)
  };
}
function n30(T, R) {
  YR(T, R.actorId), YR(T, R.connectionId);
}
function ueT(T) {
  return q0(T) ? E0(T) : null;
}
function yeT(T, R) {
  if (z0(T, R !== null), R !== null) C0(T, R);
}
function l30(T) {
  return q0(T) ? UR(T) : null;
}
function A30(T, R) {
  if (z0(T, R !== null), R !== null) HR(T, R);
}
function p30(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: ueT(T),
    actionId: l30(T)
  };
}
function _30(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), yeT(T, R.metadata), A30(T, R.actionId);
}
function b30(T) {
  return {
    id: UR(T),
    output: E0(T)
  };
}
function m30(T, R) {
  HR(T, R.id), C0(T, R.output);
}
function u30(T) {
  return {
    name: KR(T),
    args: E0(T)
  };
}
function y30(T, R) {
  YR(T, R.name), C0(T, R.args);
}
function P30(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "Init",
        val: o30(T)
      };
    case 1:
      return {
        tag: "Error",
        val: p30(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: b30(T)
      };
    case 3:
      return {
        tag: "Event",
        val: u30(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}