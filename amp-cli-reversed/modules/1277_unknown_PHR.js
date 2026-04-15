function nHR(T) {
  return {
    config: AR.of(T),
    async getLatest() {
      return T;
    }
  };
}
function TuT(T) {
  return T.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function PHR(T) {
  let R = T.lastIndexOf(":");
  if (R === -1) return {
    hostname: T,
    port: void 0
  };
  let a = T.slice(R + 1),
    e = parseInt(a, 10);
  if (isNaN(e)) return {
    hostname: T,
    port: void 0
  };
  return {
    hostname: T.slice(0, R),
    port: e
  };
}