class WidgetREPLServer {
  server = null;
  api;
  socketPath;
  constructor(T) {
    this.api = new LJT(T), this.socketPath = dD0.join(OD0.tmpdir(), `amp-widget-repl-${process.pid}.sock`);
  }
  updateRoot(T) {
    this.api.updateRoot(T);
  }
  getSocketPath() {
    return this.socketPath;
  }
  start() {
    try {
      if ($g.existsSync(this.socketPath)) $g.unlinkSync(this.socketPath);
    } catch {}
    this.server = SD0.createServer(T => {
      this.handleConnection(T);
    }), this.server.listen(this.socketPath, () => {
      try {
        $g.chmodSync(this.socketPath, 384);
      } catch {
        J.warn("Failed to chmod REPL socket; leaving default permissions");
      }
      J.info(`Widget REPL listening on ${this.socketPath}`), J.info(`Connect with: nc -U ${this.socketPath}`);
    }), this.server.on("error", T => {
      J.error("Widget REPL server error:", T);
    });
  }
  stop() {
    if (this.server) this.server.close(), this.server = null;
    try {
      if ($g.existsSync(this.socketPath)) $g.unlinkSync(this.socketPath);
    } catch {}
  }
  handleConnection(socket) {
    let rl = ED0.createInterface({
      input: socket,
      output: socket,
      terminal: !1
    });
    socket.write(`Widget REPL connected. Use $ to access the debugger API.
`), socket.write(`Examples: $.tree(), $.findByType("TextField"), $.summary()
`), socket.write("> "), rl.on("line", line => {
      let trimmed = line.trim();
      if (!trimmed) {
        socket.write("> ");
        return;
      }
      if (trimmed === "help") {
        socket.write(`Available commands:
`), socket.write(`  $.tree(maxDepth?)       - Print widget tree
`), socket.write(`  $.findByType(name)      - Find elements by widget type
`), socket.write(`  $.getFirstByType(name)  - Get first element of type
`), socket.write(`  $.getState(element)     - Get state from StatefulElement
`), socket.write(`  $.getStateOf(typeName)  - Get state of first element of type
`), socket.write(`  $.props(element)        - Get widget properties
`), socket.write(`  $.summary()             - Get tree statistics
`), socket.write(`  $.focused()             - Get focused element
`), socket.write(`  help                    - Show this help
`), socket.write(`  exit                    - Close connection
`), socket.write("> ");
        return;
      }
      if (trimmed === "exit" || trimmed === "quit") {
        socket.write(`Goodbye!
`), socket.end();
        return;
      }
      try {
        let $ = this.api,
          result = eval(trimmed);
        if (result === void 0) socket.write(`undefined
`);else if (typeof result === "string") socket.write(result + `
`);else try {
          socket.write(JSON.stringify(result, CD0, 2) + `
`);
        } catch {
          socket.write(String(result) + `
`);
        }
      } catch (T) {
        socket.write(`Error: ${T instanceof Error ? T.message : String(T)}
`);
      }
      socket.write("> ");
    }), rl.on("close", () => {
      socket.end();
    }), socket.on("error", T => {
      J.debug("Widget REPL socket error:", T);
    });
  }
}