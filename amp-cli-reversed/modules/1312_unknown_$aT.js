class $aT {
  async emitEvent(T, R, a) {
    await this.sendRequest({
      method: "event",
      event: T,
      data: R,
      span: a
    });
  }
  async sendConfigurationChange(T) {
    await this.sendRequest({
      method: "configuration.change",
      config: T
    });
  }
  async requestToolCall(T, R) {
    let a = await this.sendRequest({
      method: "tool.call",
      event: T,
      span: R
    });
    if (a && typeof a === "object" && "action" in a && typeof a.action === "string") return a;
    return {
      action: "allow"
    };
  }
  async requestToolResult(T, R) {
    let a = await this.sendRequest({
      method: "tool.result",
      event: T,
      span: R
    });
    if (a && typeof a === "object") {
      let e = a.status;
      if (e === "done" || e === "error" || e === "cancelled") return a;
    }
    return;
  }
  async requestAgentStart(T, R) {
    let a = await this.sendRequest({
      method: "agent.start",
      event: T,
      span: R
    });
    if (a && typeof a === "object") {
      let e = {};
      if ("message" in a && a.message && typeof a.message === "object") {
        let t = a.message;
        if ("content" in t && typeof t.content === "string" && t.display === !0) e.message = {
          content: t.content,
          display: !0
        };
      }
      return e;
    }
    return {};
  }
  async requestAgentEnd(T, R) {
    let a = await this.sendRequest({
      method: "agent.end",
      event: T,
      span: R
    });
    if (a && typeof a === "object" && "action" in a && typeof a.action === "string") return a;
    return {
      action: "done"
    };
  }
  async listCommands() {
    let T = await this.sendRequest({
      method: "command.list"
    });
    if (Array.isArray(T)) return T;
    return [];
  }
  async executeCommand(T, R) {
    await this.sendRequest({
      method: "command.execute",
      name: T,
      threadID: R?.threadID
    });
  }
  async listTools() {
    let T = await this.sendRequest({
      method: "tool.list"
    });
    if (Array.isArray(T)) return T;
    return [];
  }
  async executeTool(T, R) {
    return this.sendRequest({
      method: "tool.execute",
      name: T,
      input: R
    });
  }
  async listRegisteredEvents() {
    let T = await this.sendRequest({
      method: "events.list"
    });
    if (Array.isArray(T)) return T;
    return [];
  }
}