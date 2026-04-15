function kJR(T) {
  return {
    rid: UR(T),
    connections: TeT(T)
  };
}
function xJR(T, R) {
  HR(T, R.rid), ReT(T, R.connections);
}
function fJR(T) {
  return {
    rid: UR(T),
    state: YFT(T),
    isStateEnabled: q0(T)
  };
}
function IJR(T, R) {
  HR(T, R.rid), QFT(T, R.state), z0(T, R.isStateEnabled);
}
function gJR(T) {
  return {
    rid: UR(T),
    output: E0(T)
  };
}
function $JR(T, R) {
  HR(T, R.rid), C0(T, R.output);
}
function vJR(T) {
  return {
    rid: UR(T),
    payload: E0(T)
  };
}
function jJR(T, R) {
  HR(T, R.rid), C0(T, R.payload);
}
function gyT(T) {
  return {
    id: UR(T),
    name: KR(T),
    createdAtMs: UR(T)
  };
}
function SJR(T, R) {
  HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs);
}
function OJR(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [gyT(T)];
  for (let e = 1; e < R; e++) a[e] = gyT(T);
  return a;
}
function dJR(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) SJR(T, R[a]);
}
function EJR(T) {
  return {
    size: UR(T),
    maxSize: UR(T),
    messages: OJR(T),
    truncated: q0(T)
  };
}
function CJR(T, R) {
  HR(T, R.size), HR(T, R.maxSize), dJR(T, R.messages), z0(T, R.truncated);
}
function LJR(T) {
  return {
    rid: UR(T),
    status: EJR(T)
  };
}
function MJR(T, R) {
  HR(T, R.rid), CJR(T, R.status);
}
function DJR(T) {
  return {
    rid: UR(T),
    history: T2T(T),
    isWorkflowEnabled: q0(T)
  };
}
function wJR(T, R) {
  HR(T, R.rid), R2T(T, R.history), z0(T, R.isWorkflowEnabled);
}
function BJR(T) {
  return {
    state: GFT(T)
  };
}
function NJR(T, R) {
  KFT(T, R.state);
}
function UJR(T) {
  return {
    queueSize: UR(T)
  };
}
function HJR(T, R) {
  HR(T, R.queueSize);
}
function WJR(T) {
  return {
    history: VFT(T)
  };
}
function qJR(T, R) {
  XFT(T, R.history);
}
function zJR(T) {
  return {
    rid: UR(T),
    rpcs: ZFT(T)
  };
}
function FJR(T, R) {
  HR(T, R.rid), JFT(T, R.rpcs);
}
function GJR(T) {
  return {
    connections: TeT(T)
  };
}
function KJR(T, R) {
  ReT(T, R.connections);
}
function VJR(T) {
  return {
    message: KR(T)
  };
}
function XJR(T, R) {
  YR(T, R.message);
}
function YJR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "StateResponse",
        val: fJR(T)
      };
    case 1:
      return {
        tag: "ConnectionsResponse",
        val: kJR(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: gJR(T)
      };
    case 3:
      return {
        tag: "ConnectionsUpdated",
        val: GJR(T)
      };
    case 4:
      return {
        tag: "QueueUpdated",
        val: UJR(T)
      };
    case 5:
      return {
        tag: "StateUpdated",
        val: BJR(T)
      };
    case 6:
      return {
        tag: "WorkflowHistoryUpdated",
        val: WJR(T)
      };
    case 7:
      return {
        tag: "RpcsListResponse",
        val: zJR(T)
      };
    case 8:
      return {
        tag: "TraceQueryResponse",
        val: vJR(T)
      };
    case 9:
      return {
        tag: "QueueResponse",
        val: LJR(T)
      };
    case 10:
      return {
        tag: "WorkflowHistoryResponse",
        val: DJR(T)
      };
    case 11:
      return {
        tag: "Error",
        val: VJR(T)
      };
    case 12:
      return {
        tag: "Init",
        val: yJR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}