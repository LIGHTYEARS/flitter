function fyT(T) {
  return {
    id: KR(T),
    timestamp: UR(T),
    body: kZR(T)
  };
}
function fZR(T, R) {
  YR(T, R.id), HR(T, R.timestamp), xZR(T, R.body);
}
function YaT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [xyT(T)];
  for (let e = 1; e < R; e++) a[e] = xyT(T);
  return a;
}
function QaT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) oZR(T, R[a]);
}
function ZaT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [fyT(T)];
  for (let e = 1; e < R; e++) a[e] = fyT(T);
  return a;
}
function JaT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) fZR(T, R[a]);
}
function WFT(T) {
  return q0(T) ? UFT(T) : null;
}
function qFT(T, R) {
  if (z0(T, R !== null), R !== null) HFT(T, R);
}
function zFT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function FFT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function IZR(T) {
  return {
    connections: YaT(T),
    events: ZaT(T),
    state: WFT(T),
    isStateEnabled: q0(T),
    rpcs: zFT(T),
    isDatabaseEnabled: q0(T)
  };
}
function gZR(T, R) {
  QaT(T, R.connections), JaT(T, R.events), qFT(T, R.state), z0(T, R.isStateEnabled), FFT(T, R.rpcs), z0(T, R.isDatabaseEnabled);
}
function $ZR(T) {
  return {
    rid: UR(T),
    connections: YaT(T)
  };
}
function vZR(T, R) {
  HR(T, R.rid), QaT(T, R.connections);
}
function jZR(T) {
  return {
    rid: UR(T),
    state: WFT(T),
    isStateEnabled: q0(T)
  };
}
function SZR(T, R) {
  HR(T, R.rid), qFT(T, R.state), z0(T, R.isStateEnabled);
}
function OZR(T) {
  return {
    rid: UR(T),
    events: ZaT(T)
  };
}
function dZR(T, R) {
  HR(T, R.rid), JaT(T, R.events);
}
function EZR(T) {
  return {
    rid: UR(T),
    output: E0(T)
  };
}
function CZR(T, R) {
  HR(T, R.rid), C0(T, R.output);
}
function LZR(T) {
  return {
    state: UFT(T)
  };
}
function MZR(T, R) {
  HFT(T, R.state);
}
function DZR(T) {
  return {
    events: ZaT(T)
  };
}
function wZR(T, R) {
  JaT(T, R.events);
}
function BZR(T) {
  return {
    rid: UR(T),
    rpcs: zFT(T)
  };
}
function NZR(T, R) {
  HR(T, R.rid), FFT(T, R.rpcs);
}
function UZR(T) {
  return {
    connections: YaT(T)
  };
}
function HZR(T, R) {
  QaT(T, R.connections);
}
function WZR(T) {
  return {
    message: KR(T)
  };
}
function qZR(T, R) {
  YR(T, R.message);
}
function zZR(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "StateResponse",
        val: jZR(T)
      };
    case 1:
      return {
        tag: "ConnectionsResponse",
        val: $ZR(T)
      };
    case 2:
      return {
        tag: "EventsResponse",
        val: OZR(T)
      };
    case 3:
      return {
        tag: "ActionResponse",
        val: EZR(T)
      };
    case 4:
      return {
        tag: "ConnectionsUpdated",
        val: UZR(T)
      };
    case 5:
      return {
        tag: "EventsUpdated",
        val: DZR(T)
      };
    case 6:
      return {
        tag: "StateUpdated",
        val: LZR(T)
      };
    case 7:
      return {
        tag: "RpcsListResponse",
        val: BZR(T)
      };
    case 8:
      return {
        tag: "Error",
        val: WZR(T)
      };
    case 9:
      return {
        tag: "Init",
        val: IZR(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}