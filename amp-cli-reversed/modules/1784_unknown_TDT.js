function VyR(T) {
  return vP.parse(JSON.parse(T));
}
function XyR(T) {
  return JSON.stringify(T) + `
`;
}
function ZyR() {
  let T = {};
  for (let R of aDT) {
    let a = dN.env[R];
    if (a === void 0) continue;
    if (a.startsWith("()")) continue;
    T[R] = a;
  }
  return T;
}
class TDT {
  constructor(T) {
    if (this._readBuffer = new JMT(), this._stderrStream = null, this._serverParams = T, T.stderr === "pipe" || T.stderr === "overlapped") this._stderrStream = new QyR();
  }
  async start() {
    if (this._process) throw Error("StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    return new Promise((T, R) => {
      if (this._process = RDT.default(this._serverParams.command, this._serverParams.args ?? [], {
        env: {
          ...ZyR(),
          ...this._serverParams.env
        },
        stdio: ["pipe", "pipe", this._serverParams.stderr ?? "inherit"],
        shell: !1,
        windowsHide: dN.platform === "win32" && JyR(),
        cwd: this._serverParams.cwd
      }), this._process.on("error", a => {
        R(a), this.onerror?.(a);
      }), this._process.on("spawn", () => {
        T();
      }), this._process.on("close", a => {
        this._process = void 0, this.onclose?.();
      }), this._process.stdin?.on("error", a => {
        this.onerror?.(a);
      }), this._process.stdout?.on("data", a => {
        this._readBuffer.append(a), this.processReadBuffer();
      }), this._process.stdout?.on("error", a => {
        this.onerror?.(a);
      }), this._stderrStream && this._process.stderr) this._process.stderr.pipe(this._stderrStream);
    });
  }
  get stderr() {
    if (this._stderrStream) return this._stderrStream;
    return this._process?.stderr ?? null;
  }
  get pid() {
    return this._process?.pid ?? null;
  }
  processReadBuffer() {
    while (!0) try {
      let T = this._readBuffer.readMessage();
      if (T === null) break;
      this.onmessage?.(T);
    } catch (T) {
      this.onerror?.(T);
    }
  }
  async close() {
    if (this._process) {
      let T = this._process;
      this._process = void 0;
      let R = new Promise(a => {
        T.once("close", () => {
          a();
        });
      });
      try {
        T.stdin?.end();
      } catch {}
      if (await Promise.race([R, new Promise(a => setTimeout(a, 2000).unref())]), T.exitCode === null) {
        try {
          T.kill("SIGTERM");
        } catch {}
        await Promise.race([R, new Promise(a => setTimeout(a, 2000).unref())]);
      }
      if (T.exitCode === null) try {
        T.kill("SIGKILL");
      } catch {}
    }
    this._readBuffer.clear();
  }
  send(T) {
    return new Promise(R => {
      if (!this._process?.stdin) throw Error("Not connected");
      let a = XyR(T);
      if (this._process.stdin.write(a)) R();else this._process.stdin.once("drain", R);
    });
  }
}