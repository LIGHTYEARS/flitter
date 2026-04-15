function Vu(T, R, a) {
  T.writeHead(R, {
    "Content-Type": "text/plain"
  }), T.end(a);
}
class L5T {
  server = null;
  pendingFlows = new Map();
  port;
  expectedPath = "/oauth/callback";
  startPromise = null;
  constructor(T = C5T) {
    this.port = T;
  }
  async waitForCallback(T, R = pHR) {
    if (this.pendingFlows.has(T)) throw Error(`OAuth flow with state ${T} is already pending`);
    return await this.ensureServerRunning(), J.info("Registering OAuth flow with callback server", {
      state: T.slice(0, 8) + "...",
      pendingCount: this.pendingFlows.size + 1
    }), new Promise((a, e) => {
      let t = setTimeout(() => {
        J.warn("OAuth flow timed out", {
          state: T.slice(0, 8) + "..."
        }), this.pendingFlows.delete(T), this.maybeStopServer(), e(new T4T());
      }, R);
      this.pendingFlows.set(T, {
        resolve: a,
        reject: e,
        timeoutId: t
      });
    });
  }
  cancelFlow(T) {
    let R = this.pendingFlows.get(T);
    if (R) J.info("Cancelling OAuth flow", {
      state: T.slice(0, 8) + "...",
      remainingFlows: this.pendingFlows.size - 1
    }), clearTimeout(R.timeoutId), this.pendingFlows.delete(T), R.reject(Error("OAuth flow was cancelled")), this.maybeStopServer();
  }
  getRedirectUrl() {
    return `http://localhost:${this.port}${this.expectedPath}`;
  }
  hasPendingFlow(T) {
    return this.pendingFlows.has(T);
  }
  close() {
    for (let [, T] of this.pendingFlows) clearTimeout(T.timeoutId), T.reject(Error("OAuth callback server was closed"));
    if (this.pendingFlows.clear(), this.server) this.server.close(), this.server = null;
  }
  async ensureServerRunning() {
    if (this.server) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.startServer();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }
  async startServer() {
    J.debug("Starting shared OAuth callback server", {
      port: this.port
    }), this.server = E5T.createServer((T, R) => this.handleSharedRequest(T, R)), await new Promise((T, R) => {
      this.server.once("error", a => {
        if (a.code === "EADDRINUSE") R(Error(`OAuth callback server failed to start - port ${this.port} is already in use.

To fix this:
1. Run: lsof -i :${this.port} | grep LISTEN
2. Kill the process: kill <PID>
3. Then retry the OAuth flow`));else R(a);
      }), this.server.listen(this.port, _HR, () => {
        T();
      });
    }), this.server.on("clientError", (T, R) => {
      J.debug("OAuth callback server client error", {
        error: T.message
      });
      try {
        R.end(`HTTP/1.1 400 Bad Request\r
\r
`);
      } catch {}
    }), J.info("Shared OAuth callback server started", {
      port: this.port
    });
  }
  handleSharedRequest(T, R) {
    try {
      if (T.method !== "GET") {
        Vu(R, Hi.METHOD_NOT_ALLOWED, "Method Not Allowed");
        return;
      }
      let a = T.headers.host;
      if (!a) {
        Vu(R, Hi.FORBIDDEN, "Forbidden");
        return;
      }
      let {
        hostname: e,
        port: t
      } = PHR(a);
      if (!kHR(e)) {
        Vu(R, Hi.FORBIDDEN, "Forbidden");
        return;
      }
      if (t !== void 0 && t !== this.port) {
        Vu(R, Hi.FORBIDDEN, "Forbidden");
        return;
      }
      let r = new AHR(T.url, `http://${e}:${this.port}`);
      if (r.pathname !== this.expectedPath) {
        Vu(R, Hi.NOT_FOUND, "Not Found");
        return;
      }
      let h = r.searchParams.get("error");
      if (h) {
        let A = r.searchParams.get("error_description") || "",
          l = r.searchParams.get("state");
        if (l && this.pendingFlows.has(l)) {
          let o = this.pendingFlows.get(l);
          clearTimeout(o.timeoutId), this.pendingFlows.delete(l);
          let n = h === mHR.ACCESS_DENIED,
            p = n ? "User denied authorization" : `OAuth error: ${h}${A ? ` - ${A}` : ""}`;
          HI(R, Hi.BAD_REQUEST, "Authorization Failed", n ? "Access was denied. You can close this window." : p), o.reject(Error(p)), this.maybeStopServer();
          return;
        }
        HI(R, Hi.BAD_REQUEST, "Authorization Failed", h);
        return;
      }
      let i = r.searchParams.get("code"),
        c = r.searchParams.get("state");
      if (!i || !c) {
        HI(R, Hi.BAD_REQUEST, "Invalid Request", "Missing code or state parameter");
        return;
      }
      let s = this.pendingFlows.get(c);
      if (!s) {
        let A = Array.from(this.pendingFlows.keys()).map(l => l.slice(0, 8) + "...");
        J.error("OAuth callback received for unknown state", {
          receivedState: c.slice(0, 8) + "...",
          pendingStates: A,
          pendingCount: this.pendingFlows.size
        }), HI(R, Hi.BAD_REQUEST, "Unknown Request", "No pending OAuth flow for this state. The flow may have timed out.");
        return;
      }
      clearTimeout(s.timeoutId), this.pendingFlows.delete(c), HI(R, Hi.OK, "Authorization Successful", "Authorization successful! You can return to Amp."), s.resolve({
        code: i,
        state: c
      }), this.maybeStopServer();
    } catch (a) {
      J.error("Error handling OAuth callback request", {
        error: a
      });
      try {
        Vu(R, Hi.INTERNAL_SERVER_ERROR, "Internal Server Error");
      } catch {}
    }
  }
  maybeStopServer() {
    if (this.pendingFlows.size === 0 && this.server) J.debug("No pending OAuth flows, stopping shared callback server"), this.server.close(), this.server = null;
  }
}