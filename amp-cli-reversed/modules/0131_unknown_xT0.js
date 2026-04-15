function ZJR(T) {
  return {
    body: YJR(T)
  };
}
function JJR(T, R) {
  QJR(T, R.body);
}
function TT0(T) {
  let R = new A0(new Uint8Array(Nk.initialBufferLength), Nk);
  return JJR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function RT0(T) {
  let R = new A0(T, Nk),
    a = ZJR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function aT0(T) {
  return {
    state: E0(T)
  };
}
function eT0(T, R) {
  C0(T, R.state);
}
function tT0(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function rT0(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function hT0(T) {
  return {
    id: UR(T)
  };
}
function iT0(T, R) {
  HR(T, R.id);
}
function cT0(T) {
  return {
    id: UR(T)
  };
}
function sT0(T, R) {
  HR(T, R.id);
}
function oT0(T) {
  return {
    id: UR(T)
  };
}
function nT0(T, R) {
  HR(T, R.id);
}
function lT0(T) {
  return {
    id: UR(T),
    startMs: UR(T),
    endMs: UR(T),
    limit: UR(T)
  };
}
function AT0(T, R) {
  HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit);
}
function pT0(T) {
  return {
    id: UR(T),
    limit: UR(T)
  };
}
function _T0(T, R) {
  HR(T, R.id), HR(T, R.limit);
}
function bT0(T) {
  return {
    id: UR(T)
  };
}
function mT0(T, R) {
  HR(T, R.id);
}
function uT0(T) {
  return {
    id: UR(T)
  };
}
function yT0(T, R) {
  HR(T, R.id);
}
function PT0(T) {
  return {
    id: UR(T),
    table: KR(T),
    limit: UR(T),
    offset: UR(T)
  };
}
function kT0(T, R) {
  HR(T, R.id), YR(T, R.table), HR(T, R.limit), HR(T, R.offset);
}
function xT0(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "PatchStateRequest",
        val: aT0(T)
      };
    case 1:
      return {
        tag: "StateRequest",
        val: hT0(T)
      };
    case 2:
      return {
        tag: "ConnectionsRequest",
        val: cT0(T)
      };
    case 3:
      return {
        tag: "ActionRequest",
        val: tT0(T)
      };
    case 4:
      return {
        tag: "RpcsListRequest",
        val: oT0(T)
      };
    case 5:
      return {
        tag: "TraceQueryRequest",
        val: lT0(T)
      };
    case 6:
      return {
        tag: "QueueRequest",
        val: pT0(T)
      };
    case 7:
      return {
        tag: "WorkflowHistoryRequest",
        val: bT0(T)
      };
    case 8:
      return {
        tag: "DatabaseSchemaRequest",
        val: uT0(T)
      };
    case 9:
      return {
        tag: "DatabaseTableRowsRequest",
        val: PT0(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}