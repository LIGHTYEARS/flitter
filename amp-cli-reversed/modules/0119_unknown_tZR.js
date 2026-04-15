function UQR(T) {
  return {
    body: BQR(T)
  };
}
function HQR(T, R) {
  NQR(T, R.body);
}
function WQR(T) {
  let R = new A0(new Uint8Array(wk.initialBufferLength), wk);
  return HQR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function qQR(T) {
  let R = new A0(T, wk),
    a = UQR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function zQR(T) {
  return {
    state: E0(T)
  };
}
function FQR(T, R) {
  C0(T, R.state);
}
function GQR(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function KQR(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function VQR(T) {
  return {
    id: UR(T)
  };
}
function XQR(T, R) {
  HR(T, R.id);
}
function YQR(T) {
  return {
    id: UR(T)
  };
}
function QQR(T, R) {
  HR(T, R.id);
}
function ZQR(T) {
  return {
    id: UR(T)
  };
}
function JQR(T, R) {
  HR(T, R.id);
}
function TZR(T) {
  return {
    id: UR(T)
  };
}
function RZR(T, R) {
  HR(T, R.id);
}
function aZR(T) {
  return {
    id: UR(T)
  };
}
function eZR(T, R) {
  HR(T, R.id);
}
function tZR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "PatchStateRequest",
        val: zQR(T)
      };
    case 1:
      return {
        tag: "StateRequest",
        val: VQR(T)
      };
    case 2:
      return {
        tag: "ConnectionsRequest",
        val: YQR(T)
      };
    case 3:
      return {
        tag: "ActionRequest",
        val: GQR(T)
      };
    case 4:
      return {
        tag: "EventsRequest",
        val: ZQR(T)
      };
    case 5:
      return {
        tag: "ClearEventsRequest",
        val: TZR(T)
      };
    case 6:
      return {
        tag: "RpcsListRequest",
        val: aZR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}