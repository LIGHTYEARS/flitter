function dT0(T) {
  return {
    rid: UR(T),
    connections: aeT(T)
  };
}
function ET0(T, R) {
  HR(T, R.rid), eeT(T, R.connections);
}
function CT0(T) {
  return {
    rid: UR(T),
    state: h2T(T),
    isStateEnabled: q0(T)
  };
}
function LT0(T, R) {
  HR(T, R.rid), i2T(T, R.state), z0(T, R.isStateEnabled);
}
function MT0(T) {
  return {
    rid: UR(T),
    output: E0(T)
  };
}
function DT0(T, R) {
  HR(T, R.rid), C0(T, R.output);
}
function wT0(T) {
  return {
    rid: UR(T),
    payload: E0(T)
  };
}
function BT0(T, R) {
  HR(T, R.rid), C0(T, R.payload);
}
function vyT(T) {
  return {
    id: UR(T),
    name: KR(T),
    createdAtMs: UR(T)
  };
}
function NT0(T, R) {
  HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs);
}
function UT0(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [vyT(T)];
  for (let e = 1; e < R; e++) a[e] = vyT(T);
  return a;
}
function HT0(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) NT0(T, R[a]);
}
function WT0(T) {
  return {
    size: UR(T),
    maxSize: UR(T),
    messages: UT0(T),
    truncated: q0(T)
  };
}
function qT0(T, R) {
  HR(T, R.size), HR(T, R.maxSize), HT0(T, R.messages), z0(T, R.truncated);
}
function zT0(T) {
  return {
    rid: UR(T),
    status: WT0(T)
  };
}
function FT0(T, R) {
  HR(T, R.rid), qT0(T, R.status);
}
function GT0(T) {
  return {
    rid: UR(T),
    history: o2T(T),
    isWorkflowEnabled: q0(T)
  };
}
function KT0(T, R) {
  HR(T, R.rid), n2T(T, R.history), z0(T, R.isWorkflowEnabled);
}
function VT0(T) {
  return {
    rid: UR(T),
    schema: E0(T)
  };
}
function XT0(T, R) {
  HR(T, R.rid), C0(T, R.schema);
}
function YT0(T) {
  return {
    rid: UR(T),
    result: E0(T)
  };
}
function QT0(T, R) {
  HR(T, R.rid), C0(T, R.result);
}
function ZT0(T) {
  return {
    state: a2T(T)
  };
}
function JT0(T, R) {
  e2T(T, R.state);
}
function TR0(T) {
  return {
    queueSize: UR(T)
  };
}
function RR0(T, R) {
  HR(T, R.queueSize);
}
function aR0(T) {
  return {
    history: t2T(T)
  };
}
function eR0(T, R) {
  r2T(T, R.history);
}
function tR0(T) {
  return {
    rid: UR(T),
    rpcs: c2T(T)
  };
}
function rR0(T, R) {
  HR(T, R.rid), s2T(T, R.rpcs);
}
function hR0(T) {
  return {
    connections: aeT(T)
  };
}
function iR0(T, R) {
  eeT(T, R.connections);
}
function cR0(T) {
  return {
    message: KR(T)
  };
}
function sR0(T, R) {
  YR(T, R.message);
}
function oR0(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "StateResponse",
        val: CT0(T)
      };
    case 1:
      return {
        tag: "ConnectionsResponse",
        val: dT0(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: MT0(T)
      };
    case 3:
      return {
        tag: "ConnectionsUpdated",
        val: hR0(T)
      };
    case 4:
      return {
        tag: "QueueUpdated",
        val: TR0(T)
      };
    case 5:
      return {
        tag: "StateUpdated",
        val: ZT0(T)
      };
    case 6:
      return {
        tag: "WorkflowHistoryUpdated",
        val: aR0(T)
      };
    case 7:
      return {
        tag: "RpcsListResponse",
        val: tR0(T)
      };
    case 8:
      return {
        tag: "TraceQueryResponse",
        val: wT0(T)
      };
    case 9:
      return {
        tag: "QueueResponse",
        val: zT0(T)
      };
    case 10:
      return {
        tag: "WorkflowHistoryResponse",
        val: GT0(T)
      };
    case 11:
      return {
        tag: "Error",
        val: cR0(T)
      };
    case 12:
      return {
        tag: "Init",
        val: ST0(T)
      };
    case 13:
      return {
        tag: "DatabaseSchemaResponse",
        val: VT0(T)
      };
    case 14:
      return {
        tag: "DatabaseTableRowsResponse",
        val: YT0(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}