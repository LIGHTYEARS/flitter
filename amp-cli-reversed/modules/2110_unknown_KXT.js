function ZxT() {
  if (wM() !== "linux") return !1;
  return Boolean(process.env.WSL_DISTRO_NAME) || Ok0("/proc/sys/fs/binfmt_misc/WSLInterop");
}
class KXT {
  capabilities = null;
  pendingReadPromise = null;
  readResolve = null;
  readTimeout = null;
  tmuxSetClipboard = "unknown";
  setCapabilities(T) {
    if (this.capabilities = T, Xb()) this.detectTmuxSetClipboard();
  }
  detectTmuxSetClipboard() {
    E_("tmux", ["show-options", "-s", "-v", "set-clipboard"], {
      timeout: 1000
    }, (T, R) => {
      if (!T) {
        let a = R.trim();
        if (a === "on" || a === "external" || a === "off") this.tmuxSetClipboard = a;
      }
    });
  }
  isTmuxOsc52Allowed() {
    return this.tmuxSetClipboard === "on" || this.tmuxSetClipboard === "unknown";
  }
  isOsc52Supported() {
    return this.capabilities?.osc52 ?? !1;
  }
  async commandExists(T) {
    try {
      return await Pg("which", [T]), !0;
    } catch {
      return !1;
    }
  }
  async writeToPbcopy(T) {
    try {
      let R = E_("pbcopy");
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", t => {
          if (t === 0) a();else e(Error(`pbcopy exited with code ${t}`));
        });
      }), !0;
    } catch {
      return !1;
    }
  }
  async writeToWlCopy(T) {
    try {
      let R = E_("wl-copy");
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", t => {
          if (t === 0) a();else e(Error(`wl-copy exited with code ${t}`));
        });
      }), !0;
    } catch {
      return !1;
    }
  }
  async writeToXclip(T) {
    try {
      let R = E_("xclip", ["-selection", "clipboard"]);
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", t => {
          if (t === 0) a();else e(Error(`xclip exited with code ${t}`));
        });
      }), !0;
    } catch {
      return !1;
    }
  }
  async writeToClipExe(T) {
    try {
      let R = E_("clip.exe");
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", t => {
          if (t === 0) a();else e(Error(`clip.exe exited with code ${t}`));
        });
      }), !0;
    } catch {
      return !1;
    }
  }
  async writeToPowerShell(T) {
    try {
      let R = E_("powershell.exe", ["-NoProfile", "-Command", "$Input | Set-Clipboard"]);
      return R.stdin?.write(T), R.stdin?.end(), await new Promise((a, e) => {
        R.on("close", t => {
          if (t === 0) a();else e(Error(`powershell.exe exited with code ${t}`));
        });
      }), !0;
    } catch {
      return !1;
    }
  }
  async readFromOSC52WithQuery(T) {
    if (!this.isOsc52Supported()) return null;
    if (this.pendingReadPromise !== void 0) return this.pendingReadPromise;
    this.pendingReadPromise = new Promise(a => {
      this.readResolve = a, this.readTimeout = setTimeout(() => {
        this.readResolve = null, this.pendingReadPromise = null, a(null);
      }, 2000), process.stdout.write(T);
    });
    let R = await this.pendingReadPromise;
    return this.pendingReadPromise = null, R;
  }
  async readFromOSC52() {
    return this.readFromOSC52WithQuery(Ck0);
  }
  handleOSC52Response(T) {
    if (this.readResolve && this.readTimeout) {
      clearTimeout(this.readTimeout), this.readTimeout = null;
      try {
        let R = Buffer.from(T, "base64").toString("utf8");
        this.readResolve(R);
      } catch {
        this.readResolve(null);
      }
      this.readResolve = null, this.pendingReadPromise = null;
    }
  }
  async readFromPbpaste() {
    try {
      let {
        stdout: T
      } = await Pg("pbpaste");
      return T;
    } catch {
      return null;
    }
  }
  async readFromWlPaste(T) {
    try {
      let R = ["--no-newline"];
      if (T === "primary") R.push("--primary");
      let {
        stdout: a
      } = await Pg("wl-paste", R);
      return a;
    } catch {
      return null;
    }
  }
  async readFromXclip(T) {
    try {
      let {
        stdout: R
      } = await Pg("xclip", ["-selection", T, "-o"]);
      return R;
    } catch {
      return null;
    }
  }
  async readFromPowerShell() {
    try {
      let {
        stdout: T
      } = await Pg("powershell.exe", ["-NoProfile", "-Command", "Get-Clipboard"]);
      return T;
    } catch {
      return null;
    }
  }
  async readFromOSC52Primary() {
    return this.readFromOSC52WithQuery(Lk0);
  }
  async readText() {
    if (this.isOsc52Supported()) {
      let R = await this.readFromOSC52();
      if (R !== null) return R;
    }
    let T = wM();
    if (T === "darwin") {
      let R = await this.readFromPbpaste();
      if (R !== null) return R;
    } else if (T === "win32") {
      let R = await this.readFromPowerShell();
      if (R !== null) return R;
    } else {
      if (await this.commandExists("wl-paste")) {
        let R = await this.readFromWlPaste("clipboard");
        if (R !== null) return R;
      }
      if (await this.commandExists("xclip")) {
        let R = await this.readFromXclip("clipboard");
        if (R !== null) return R;
      }
      if (ZxT()) {
        let R = await this.readFromPowerShell();
        if (R !== null) return R;
      }
    }
    return null;
  }
  async readPrimarySelection() {
    let T = wM();
    if (T === "darwin" || T === "win32") return this.readText();
    if (this.isOsc52Supported()) {
      let R = await this.readFromOSC52Primary();
      if (R !== null) return R;
    }
    if (await this.commandExists("wl-paste")) {
      let R = await this.readFromWlPaste("primary");
      if (R !== null) return R;
    }
    if (await this.commandExists("xclip")) {
      let R = await this.readFromXclip("primary");
      if (R !== null) return R;
    }
    return null;
  }
  async writeText(T) {
    let R = Xb(),
      a = !1;
    if (this.isOsc52Supported() && (!R || this.isTmuxOsc52Allowed())) {
      let t = Buffer.from(T).toString("base64"),
        r = Ek0(t);
      if (process.stdout.write(r), a = !0, !R) return !0;
    }
    let e = wM();
    if (e === "darwin") {
      if (await this.writeToPbcopy(T)) return !0;
    } else if (e === "win32") {
      if (await this.writeToPowerShell(T)) return !0;
      if (await this.writeToClipExe(T)) return !0;
    } else {
      if ((await this.commandExists("wl-copy")) && (await this.writeToWlCopy(T))) return !0;
      if ((await this.commandExists("xclip")) && (await this.writeToXclip(T))) return !0;
      if (ZxT()) {
        if (await this.writeToPowerShell(T)) return !0;
      }
    }
    if (a) return !0;
    return !1;
  }
}