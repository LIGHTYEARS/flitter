function KkT(T) {
  if (!T) return {};
  let R = {
    reconnectCauseType: T.type,
    reconnectCauseAt: new Date(T.at).toISOString()
  };
  if (T.code !== void 0) R.reconnectCauseCode = T.code;
  if (T.reason) R.reconnectCauseReason = T.reason;
  if (T.error) R.reconnectCauseError = T.error;
  return R;
}