function O40(T) {
  return !1;
}
class RJT {
  configService;
  constructor(T) {
    this.configService = T;
  }
  recordEvent(T) {
    let R = S40(T, "cli"),
      a = JSON.stringify([R]);
    pLT(a, this.configService).catch(e => {
      if (O40(e)) return;
      J.error("Failed to send telemetry", {
        error: e,
        feature: T.feature,
        action: T.action
      });
    });
  }
}