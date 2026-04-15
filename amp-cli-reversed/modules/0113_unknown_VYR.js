function pt(T) {
  return new fYR(T);
}
function IYR(T) {
  return {
    state: E0(T)
  };
}
function gYR(T, R) {
  C0(T, R.state);
}
function $YR(T) {
  return {
    id: UR(T),
    name: KR(T),
    args: E0(T)
  };
}
function vYR(T, R) {
  HR(T, R.id), YR(T, R.name), C0(T, R.args);
}
function jYR(T) {
  return {
    id: UR(T)
  };
}
function SYR(T, R) {
  HR(T, R.id);
}
function OYR(T) {
  return {
    id: UR(T)
  };
}
function dYR(T, R) {
  HR(T, R.id);
}
function EYR(T) {
  return {
    id: UR(T)
  };
}
function CYR(T, R) {
  HR(T, R.id);
}
function LYR(T) {
  return {
    id: UR(T),
    startMs: UR(T),
    endMs: UR(T),
    limit: UR(T)
  };
}
function MYR(T, R) {
  HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit);
}
function DYR(T) {
  return {
    id: UR(T),
    limit: UR(T)
  };
}
function wYR(T, R) {
  HR(T, R.id), HR(T, R.limit);
}
function BYR(T) {
  return {
    id: UR(T)
  };
}
function NYR(T, R) {
  HR(T, R.id);
}
function UYR(T) {
  return q0(T) ? KR(T) : null;
}
function HYR(T, R) {
  if (z0(T, R !== null), R !== null) YR(T, R);
}
function WYR(T) {
  return {
    id: UR(T),
    entryId: UYR(T)
  };
}
function qYR(T, R) {
  HR(T, R.id), HYR(T, R.entryId);
}
function zYR(T) {
  return {
    id: UR(T)
  };
}
function FYR(T, R) {
  HR(T, R.id);
}
function GYR(T) {
  return {
    id: UR(T),
    table: KR(T),
    limit: UR(T),
    offset: UR(T)
  };
}
function KYR(T, R) {
  HR(T, R.id), YR(T, R.table), HR(T, R.limit), HR(T, R.offset);
}
function VYR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "PatchStateRequest",
        val: IYR(T)
      };
    case 1:
      return {
        tag: "StateRequest",
        val: jYR(T)
      };
    case 2:
      return {
        tag: "ConnectionsRequest",
        val: OYR(T)
      };
    case 3:
      return {
        tag: "ActionRequest",
        val: $YR(T)
      };
    case 4:
      return {
        tag: "RpcsListRequest",
        val: EYR(T)
      };
    case 5:
      return {
        tag: "TraceQueryRequest",
        val: LYR(T)
      };
    case 6:
      return {
        tag: "QueueRequest",
        val: DYR(T)
      };
    case 7:
      return {
        tag: "WorkflowHistoryRequest",
        val: BYR(T)
      };
    case 8:
      return {
        tag: "WorkflowReplayRequest",
        val: WYR(T)
      };
    case 9:
      return {
        tag: "DatabaseSchemaRequest",
        val: zYR(T)
      };
    case 10:
      return {
        tag: "DatabaseTableRowsRequest",
        val: GYR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}