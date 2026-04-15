function pC0(T) {
  if (T) return T;
  if (process.env.AMP_URL) return process.env.AMP_URL;
  return Lr;
}
function _C0(T) {
  if (process.env.AMP_WORKER_URL) return process.env.AMP_WORKER_URL;
  return T.includes("staging.ampcodedev.org") ? "https://staging.ampworkers.com" : "https://production.ampworkers.com";
}