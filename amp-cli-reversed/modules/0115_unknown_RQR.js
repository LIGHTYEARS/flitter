function YYR(T) {
  return {
    body: VYR(T)
  };
}
function QYR(T, R) {
  XYR(T, R.body);
}
function ZYR(T) {
  let R = new A0(new Uint8Array(wk.initialBufferLength), wk);
  return QYR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function JYR(T) {
  let R = new A0(T, wk),
    a = YYR(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function EFT(T) {
  return E0(T);
}
function CFT(T, R) {
  C0(T, R);
}
function PyT(T) {
  return {
    id: KR(T),
    details: E0(T)
  };
}
function TQR(T, R) {
  YR(T, R.id), C0(T, R.details);
}
function LFT(T) {
  return E0(T);
}
function MFT(T, R) {
  C0(T, R);
}
function GaT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [PyT(T)];
  for (let e = 1; e < R; e++) a[e] = PyT(T);
  return a;
}
function KaT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) TQR(T, R[a]);
}
function DFT(T) {
  return q0(T) ? EFT(T) : null;
}
function wFT(T, R) {
  if (z0(T, R !== null), R !== null) CFT(T, R);
}
function BFT(T) {
  let R = M8(T);
  if (R === 0) return [];
  let a = [KR(T)];
  for (let e = 1; e < R; e++) a[e] = KR(T);
  return a;
}
function NFT(T, R) {
  D8(T, R.length);
  for (let a = 0; a < R.length; a++) YR(T, R[a]);
}
function VaT(T) {
  return q0(T) ? LFT(T) : null;
}
function XaT(T, R) {
  if (z0(T, R !== null), R !== null) MFT(T, R);
}
function RQR(T) {
  return {
    connections: GaT(T),
    state: DFT(T),
    isStateEnabled: q0(T),
    rpcs: BFT(T),
    isDatabaseEnabled: q0(T),
    queueSize: UR(T),
    workflowHistory: VaT(T),
    isWorkflowEnabled: q0(T)
  };
}