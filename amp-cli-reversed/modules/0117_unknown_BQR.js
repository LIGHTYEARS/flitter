function eQR(T) {
  return {
    rid: UR(T),
    connections: GaT(T)
  };
}
function tQR(T, R) {
  HR(T, R.rid), KaT(T, R.connections);
}
function rQR(T) {
  return {
    rid: UR(T),
    state: DFT(T),
    isStateEnabled: q0(T)
  };
}
function hQR(T, R) {
  HR(T, R.rid), wFT(T, R.state), z0(T, R.isStateEnabled);
}
function iQR(T) {
  return {
    rid: UR(T),
    output: E0(T)
  };
}
function cQR(T, R) {
  HR(T, R.rid), C0(T, R.output);
}
function sQR(T) {
  return {
    rid: UR(T),
    payload: E0(T)
  };
}
function oQR(T, R) {
  HR(T, R.rid), C0(T, R.payload);
}
function kyT(T) {
  return {
    id: UR(T),
    name: KR(T),
    createdAtMs: UR(T)
  };
}
function nQR(T, R) {
  HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs);
}
function lQR(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [kyT(T)];
  for (let e = 1; e < R; e++) a[e] = kyT(T);
  return a;
}
function AQR(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) nQR(T, R[a]);
}
function pQR(T) {
  return {
    size: UR(T),
    maxSize: UR(T),
    messages: lQR(T),
    truncated: q0(T)
  };
}
function _QR(T, R) {
  HR(T, R.size), HR(T, R.maxSize), AQR(T, R.messages), z0(T, R.truncated);
}
function bQR(T) {
  return {
    rid: UR(T),
    status: pQR(T)
  };
}
function mQR(T, R) {
  HR(T, R.rid), _QR(T, R.status);
}
function uQR(T) {
  return {
    rid: UR(T),
    history: VaT(T),
    isWorkflowEnabled: q0(T)
  };
}
function yQR(T, R) {
  HR(T, R.rid), XaT(T, R.history), z0(T, R.isWorkflowEnabled);
}
function PQR(T) {
  return {
    rid: UR(T),
    history: VaT(T),
    isWorkflowEnabled: q0(T)
  };
}
function kQR(T, R) {
  HR(T, R.rid), XaT(T, R.history), z0(T, R.isWorkflowEnabled);
}
function xQR(T) {
  return {
    rid: UR(T),
    schema: E0(T)
  };
}
function fQR(T, R) {
  HR(T, R.rid), C0(T, R.schema);
}
function IQR(T) {
  return {
    rid: UR(T),
    result: E0(T)
  };
}
function gQR(T, R) {
  HR(T, R.rid), C0(T, R.result);
}
function $QR(T) {
  return {
    state: EFT(T)
  };
}
function vQR(T, R) {
  CFT(T, R.state);
}
function jQR(T) {
  return {
    queueSize: UR(T)
  };
}
function SQR(T, R) {
  HR(T, R.queueSize);
}
function OQR(T) {
  return {
    history: LFT(T)
  };
}
function dQR(T, R) {
  MFT(T, R.history);
}
function EQR(T) {
  return {
    rid: UR(T),
    rpcs: BFT(T)
  };
}
function CQR(T, R) {
  HR(T, R.rid), NFT(T, R.rpcs);
}
function LQR(T) {
  return {
    connections: GaT(T)
  };
}
function MQR(T, R) {
  KaT(T, R.connections);
}
function DQR(T) {
  return {
    message: KR(T)
  };
}
function wQR(T, R) {
  YR(T, R.message);
}
function BQR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "StateResponse",
        val: rQR(T)
      };
    case 1:
      return {
        tag: "ConnectionsResponse",
        val: eQR(T)
      };
    case 2:
      return {
        tag: "ActionResponse",
        val: iQR(T)
      };
    case 3:
      return {
        tag: "ConnectionsUpdated",
        val: LQR(T)
      };
    case 4:
      return {
        tag: "QueueUpdated",
        val: jQR(T)
      };
    case 5:
      return {
        tag: "StateUpdated",
        val: $QR(T)
      };
    case 6:
      return {
        tag: "WorkflowHistoryUpdated",
        val: OQR(T)
      };
    case 7:
      return {
        tag: "RpcsListResponse",
        val: EQR(T)
      };
    case 8:
      return {
        tag: "TraceQueryResponse",
        val: sQR(T)
      };
    case 9:
      return {
        tag: "QueueResponse",
        val: bQR(T)
      };
    case 10:
      return {
        tag: "WorkflowHistoryResponse",
        val: uQR(T)
      };
    case 11:
      return {
        tag: "WorkflowReplayResponse",
        val: PQR(T)
      };
    case 12:
      return {
        tag: "Error",
        val: DQR(T)
      };
    case 13:
      return {
        tag: "Init",
        val: RQR(T)
      };
    case 14:
      return {
        tag: "DatabaseSchemaResponse",
        val: xQR(T)
      };
    case 15:
      return {
        tag: "DatabaseTableRowsResponse",
        val: IQR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}