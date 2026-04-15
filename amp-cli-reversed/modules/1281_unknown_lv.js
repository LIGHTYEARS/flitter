class lv {
  storageDir;
  secretStorage;
  constructor(T, R) {
    this.secretStorage = T, this.storageDir = R || MX.join(process.env.HOME || process.env.USERPROFILE || ".", ".amp", "oauth");
  }
  getStorageKey(T, R) {
    return `${T || ""}#${R}`;
  }
  async ensureStorageDir() {
    try {
      await gi.mkdir(this.storageDir, {
        recursive: !0,
        mode: 448
      });
    } catch (T) {
      if (T?.code !== "EEXIST") throw J.error("Failed to create OAuth storage directory", {
        error: T,
        dir: this.storageDir
      }), T;
    }
  }
  getClientInfoPath(T) {
    return MX.join(this.storageDir, `${T}-client.json`);
  }
  async atomicWrite(T, R, a) {
    await this.ensureStorageDir();
    let e = `${T}.tmp.${fHR(8).toString("hex")}`;
    try {
      let t = await gi.open(e, "w", a);
      try {
        await t.writeFile(R), await t.sync();
      } finally {
        await t.close();
      }
      await gi.rename(e, T);
    } catch (t) {
      try {
        await gi.unlink(e);
      } catch {}
      throw t;
    }
  }
  async saveClientInfo(T, R) {
    if (R.clientSecret) {
      let r = this.getStorageKey(R.serverUrl, T);
      await this.secretStorage.set("mcp-oauth-client-secret", R.clientSecret, r);
    }
    let {
        clientSecret: a,
        ...e
      } = R,
      t = this.getClientInfoPath(T);
    await this.atomicWrite(t, JSON.stringify(e, null, 2), 384), J.info("Saved OAuth client info", {
      serverName: T,
      filePath: t
    });
  }
  async getClientInfo(T, R) {
    try {
      let a = this.getClientInfoPath(T),
        e = await gi.readFile(a, "utf8"),
        t = JSON.parse(e);
      if (R && t.serverUrl) {
        if (t.serverUrl !== R) return J.warn("OAuth credentials rejected: server URL changed", {
          serverName: T,
          storedUrl: t.serverUrl,
          expectedUrl: R
        }), null;
      }
      let r = this.getStorageKey(t.serverUrl, T),
        h = await this.secretStorage.get("mcp-oauth-client-secret", r);
      return {
        ...t,
        clientSecret: h || void 0
      };
    } catch (a) {
      if (a?.code === "ENOENT") return null;
      if (a instanceof SyntaxError) {
        J.error("Corrupted OAuth client info - invalid JSON", {
          error: a,
          serverName: T
        });
        let e = this.getClientInfoPath(T),
          t = `${e}.corrupted.${Date.now()}`;
        try {
          await gi.rename(e, t), J.info("Moved corrupted client info to backup", {
            backupPath: t
          });
        } catch {}
        return null;
      }
      throw J.error("Failed to read OAuth client info", {
        error: a,
        serverName: T
      }), a;
    }
  }
  async saveTokens(T, R) {
    let a = await this.getClientInfo(T);
    if (!a) throw Error(`Cannot save tokens for server "${T}": client info not found. Run "amp mcp oauth login ${T}" to set up OAuth authentication first.`);
    let e = this.getStorageKey(a.serverUrl, T);
    await this.secretStorage.set("mcp-oauth-token", JSON.stringify(R), e), J.debug("Saved OAuth tokens", {
      serverName: T
    });
  }
  async getTokens(T, R) {
    try {
      let a = await this.getClientInfo(T, R);
      if (!a) return null;
      let e = this.getStorageKey(a.serverUrl, T),
        t = await this.secretStorage.get("mcp-oauth-token", e);
      if (!t) return null;
      return JSON.parse(t);
    } catch (a) {
      if (a instanceof SyntaxError) return J.error("Corrupted OAuth tokens - invalid JSON", {
        error: a,
        serverName: T
      }), null;
      throw J.error("Failed to read OAuth tokens", {
        error: a,
        serverName: T
      }), a;
    }
  }
  async clearTokens(T) {
    let R;
    try {
      R = (await this.getClientInfo(T))?.serverUrl;
    } catch (e) {
      J.warn("Failed to read client info for token cleanup", {
        error: e,
        serverName: T
      });
    }
    let a = R ? [R, void 0] : [void 0];
    for (let e of a) try {
      let t = this.getStorageKey(e, T);
      await this.secretStorage.set("mcp-oauth-token", "", t);
    } catch (t) {
      J.warn("Failed to clear OAuth tokens", {
        error: t,
        serverName: T
      });
    }
    J.debug("Cleared OAuth tokens", {
      serverName: T
    });
  }
  async clearClientInfo(T) {
    let R = this.getClientInfoPath(T),
      a;
    try {
      a = (await this.getClientInfo(T))?.serverUrl;
    } catch (t) {
      J.warn("Failed to read client info for cleanup", {
        error: t,
        serverName: T
      });
    }
    try {
      await gi.unlink(R);
    } catch (t) {
      if (t?.code !== "ENOENT") J.warn("Failed to delete client info file", {
        error: t,
        serverName: T
      });
    }
    let e = a ? [a, void 0] : [void 0];
    for (let t of e) try {
      let r = this.getStorageKey(t, T);
      await this.secretStorage.set("mcp-oauth-client-secret", "", r);
    } catch (r) {
      J.warn("Failed to clear client secret", {
        error: r,
        serverName: T
      });
    }
    J.debug("Cleared OAuth client info", {
      serverName: T
    });
  }
  async clearAll(T) {
    await this.clearClientInfo(T), await this.clearTokens(T), J.debug("Cleared all OAuth data", {
      serverName: T
    });
  }
}