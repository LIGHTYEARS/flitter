class gRR {
  enabled;
  configService;
  commandCounts = new Map();
  timer = null;
  bufferTimeMs = 1e4;
  constructor(T, R) {
    this.enabled = T, this.configService = R, this.startTimer();
  }
  startTimer() {
    this.timer = setInterval(() => {
      this.flushEvents();
    }, this.bufferTimeMs);
  }
  async flushEvents() {
    if (this.commandCounts.size === 0 || !(await this.enabled())) return;
    let T = Array.from(this.commandCounts.entries()).map(([R, a]) => ({
      feature: "cli.command",
      action: R,
      source: {
        client: "cli",
        clientVersion: "0.0.1775894934-g5bb49b"
      },
      parameters: {
        metadata: {
          count: a
        }
      },
      timestamp: Date.now() * 1000
    }));
    this.commandCounts.clear();
    try {
      let R = JSON.stringify(T);
      await pLT(R, this.configService);
    } catch (R) {
      J.error("Failed to export command telemetry events", R);
    }
  }
  async submit(T) {
    if (!(await this.enabled()) || this.timer === null) return;
    let R = this.commandCounts.get(T) || 0;
    this.commandCounts.set(T, R + 1);
  }
  async dispose() {
    if (await this.flushEvents(), this.timer !== null) clearInterval(this.timer), this.timer = null;
  }
}