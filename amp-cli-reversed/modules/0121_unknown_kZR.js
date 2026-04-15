function hZR(T) {
  return {
    body: tZR(T)
  };
}
function iZR(T, R) {
  rZR(T, R.body);
}
function cZR(T) {
  let R = new A0(new Uint8Array(Bk.initialBufferLength), Bk);
  return iZR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function sZR(T) {
  let R = new A0(T, Bk),
    a = hZR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function UFT(T) {
  return E0(T);
}
function HFT(T, R) {
  C0(T, R);
}
function xyT(T) {
  return {
    id: KR(T),
    details: E0(T)
  };
}
function oZR(T, R) {
  YR(T, R.id), C0(T, R.details);
}
function nZR(T) {
  return {
    name: KR(T),
    args: E0(T),
    connId: KR(T)
  };
}
function lZR(T, R) {
  YR(T, R.name), C0(T, R.args), YR(T, R.connId);
}
function AZR(T) {
  return {
    eventName: KR(T),
    args: E0(T)
  };
}
function pZR(T, R) {
  YR(T, R.eventName), C0(T, R.args);
}
function _ZR(T) {
  return {
    eventName: KR(T),
    connId: KR(T)
  };
}
function bZR(T, R) {
  YR(T, R.eventName), YR(T, R.connId);
}
function mZR(T) {
  return {
    eventName: KR(T),
    connId: KR(T)
  };
}
function uZR(T, R) {
  YR(T, R.eventName), YR(T, R.connId);
}
function yZR(T) {
  return {
    eventName: KR(T),
    args: E0(T),
    connId: KR(T)
  };
}
function PZR(T, R) {
  YR(T, R.eventName), C0(T, R.args), YR(T, R.connId);
}
function kZR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "ActionEvent",
        val: nZR(T)
      };
    case 1:
      return {
        tag: "BroadcastEvent",
        val: AZR(T)
      };
    case 2:
      return {
        tag: "SubscribeEvent",
        val: _ZR(T)
      };
    case 3:
      return {
        tag: "UnSubscribeEvent",
        val: mZR(T)
      };
    case 4:
      return {
        tag: "FiredEvent",
        val: yZR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}