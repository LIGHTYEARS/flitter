function rtT() {
  return new Date().toISOString();
}
function Qp0(T) {
  let R = T.trim();
  if (!(R.startsWith("{") && R.endsWith("}") || R.startsWith("[") && R.endsWith("]"))) return null;
  try {
    return JSON.parse(R);
  } catch {
    return null;
  }
}