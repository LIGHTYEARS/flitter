function GZR(T) {
  return {
    body: zZR(T)
  };
}
function KZR(T, R) {
  FZR(T, R.body);
}
function VZR(T) {
  let R = new A0(new Uint8Array(Bk.initialBufferLength), Bk);
  return KZR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function XZR(T) {
  let R = new A0(T, Bk),
    a = GZR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function YZR(T) {
  return {
    state: E0(T)
  };
}
function QZR(T, R) {
  C0(T, R.state);
}
function ZZR(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function JZR(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function TJR(T) {
  return {
    id: UR(T)
  };
}
function RJR(T, R) {
  HR(T, R.id);
}
function aJR(T) {
  return {
    id: UR(T)
  };
}
function eJR(T, R) {
  HR(T, R.id);
}
function tJR(T) {
  return {
    id: UR(T)
  };
}
function rJR(T, R) {
  HR(T, R.id);
}
function hJR(T) {
  return {
    id: UR(T),
    startMs: UR(T),
    endMs: UR(T),
    limit: UR(T)
  };
}
function iJR(T, R) {
  HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit);
}
function cJR(T) {
  return {
    id: UR(T),
    limit: UR(T)
  };
}
function sJR(T, R) {
  HR(T, R.id), HR(T, R.limit);
}
function oJR(T) {
  return {
    id: UR(T)
  };
}
function nJR(T, R) {
  HR(T, R.id);
}
function lJR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "PatchStateRequest",
        val: YZR(T)
      };
    case 1:
      return {
        tag: "StateRequest",
        val: TJR(T)
      };
    case 2:
      return {
        tag: "ConnectionsRequest",
        val: aJR(T)
      };
    case 3:
      return {
        tag: "ActionRequest",
        val: ZZR(T)
      };
    case 4:
      return {
        tag: "RpcsListRequest",
        val: tJR(T)
      };
    case 5:
      return {
        tag: "TraceQueryRequest",
        val: hJR(T)
      };
    case 6:
      return {
        tag: "QueueRequest",
        val: cJR(T)
      };
    case 7:
      return {
        tag: "WorkflowHistoryRequest",
        val: oJR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}