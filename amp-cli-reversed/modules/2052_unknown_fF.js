async function $XT(T) {
  try {
    await tXT(T);
  } catch (R) {
    if (StT(R)) return !1;
    throw R;
  }
  return await ftT(T, {
    recursive: !0,
    force: !0
  }), !0;
}
function vXT(T) {
  if (!(T instanceof Error)) return null;
  return T.message.match(TP0)?.[1] ?? null;
}
function jtT(T) {
  return vXT(T) === "EXECUTOR_NOT_CONNECTED";
}
function IP0(T) {
  return T instanceof z8 || jtT(T);
}
function fF(T) {
  if (T instanceof z8) return "live-sync: waiting to reconnect to DTW...";
  if (jtT(T)) return "live-sync: waiting for the executor filesystem to come online...";
  return `live-sync: waiting to sync: ${CM(T)}`;
}