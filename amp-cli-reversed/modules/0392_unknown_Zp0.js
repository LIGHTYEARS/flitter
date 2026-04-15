function Zp0(T) {
  let R = {
    reconnectCauseType: T.type,
    reconnectCauseAt: new Date(T.at).toISOString()
  };
  if (T.code !== void 0) R.reconnectCode = T.code;
  if (T.reason) R.reconnectReason = T.reason;
  if (T.error) R.reconnectError = T.error;
  return R;
}