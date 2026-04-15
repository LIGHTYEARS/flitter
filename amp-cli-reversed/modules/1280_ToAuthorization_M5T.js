class M5T {
  storage;
  serverName;
  redirectUrlValue;
  clientMetadataValue;
  manualClientId;
  manualClientSecret;
  serverUrl;
  manualAuthUrl;
  manualTokenUrl;
  _onAuthStateChange;
  currentCodeVerifier;
  currentState;
  authInProgress = !1;
  authCodePromise;
  clientInfoSaved = !1;
  headlessAuthHandler;
  headlessAuthCode;
  shouldInitiateOAuth;
  pendingAuthorizationUrl;
  holdsLock = !1;
  waitingOnLockHolder;
  resetFlowState() {
    if (J.debug("Resetting OAuth flow state", {
      serverName: this.serverName
    }), this.currentCodeVerifier = void 0, this.currentState) hz.cancelFlow(this.currentState);
    this.currentState = void 0, this.authInProgress = !1, this.authCodePromise = void 0, this.headlessAuthCode = void 0, this.pendingAuthorizationUrl = void 0, this.waitingOnLockHolder = void 0;
  }
  set onAuthStateChange(T) {
    this._onAuthStateChange = T;
  }
  get onAuthStateChange() {
    return this._onAuthStateChange;
  }
  constructor(T) {
    if (this.storage = T.storage, this.serverName = T.serverName, this.serverUrl = T.serverUrl, this.redirectUrlValue = T.redirectUrl || `http://localhost:${C5T}/oauth/callback`, this.manualClientId = T.clientId, this.manualClientSecret = T.clientSecret, this.manualAuthUrl = T.authUrl, this.manualTokenUrl = T.tokenUrl, this._onAuthStateChange = T.onAuthStateChange, this.headlessAuthHandler = T.headlessAuthHandler, this.shouldInitiateOAuth = T.shouldInitiateOAuth, J.debug("Created OAuth provider instance", {
      serverName: this.serverName,
      serverUrl: this.serverUrl,
      hasManualCredentials: !!T.clientId,
      headlessMode: !!T.headlessAuthHandler
    }), this.clientMetadataValue = {
      client_name: T.clientMetadata?.client_name || `Amp MCP Client (${this.serverName})`,
      redirect_uris: [this.redirectUrlValue],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      ...T.clientMetadata
    }, T.scopes && T.scopes.length > 0) this.clientMetadataValue.scope = T.scopes.join(" ");
  }
  get redirectUrl() {
    return this.redirectUrlValue;
  }
  get clientMetadata() {
    return this.clientMetadataValue;
  }
  async state() {
    if (!this.currentState) this.currentState = lHR(32).toString("hex"), J.info("Generated new OAuth state", {
      serverName: this.serverName,
      state: this.currentState.slice(0, 8) + "..."
    });
    return this.currentState;
  }
  async clientInformation() {
    if (this.manualClientId) {
      if (J.debug("Using manually provided client credentials", {
        serverName: this.serverName,
        hasSecret: !!this.manualClientSecret
      }), !this.clientInfoSaved) await this.storage.saveClientInfo(this.serverName, {
        clientId: this.manualClientId,
        clientSecret: this.manualClientSecret,
        redirectUrl: this.redirectUrlValue,
        authUrl: this.manualAuthUrl || "",
        tokenUrl: this.manualTokenUrl || "",
        serverUrl: this.serverUrl
      }), this.clientInfoSaved = !0, J.debug("Saved manual client credentials to storage", {
        serverName: this.serverName
      });
      return {
        client_id: this.manualClientId,
        client_secret: this.manualClientSecret
      };
    }
    let T = await this.storage.getClientInfo(this.serverName, this.serverUrl);
    if (T) return J.debug("Using stored client credentials", {
      serverName: this.serverName,
      hasSecret: !!T.clientSecret
    }), {
      client_id: T.clientId,
      client_secret: T.clientSecret
    };
    J.debug("No client credentials found - SDK will attempt DCR", {
      serverName: this.serverName
    });
    return;
  }
  async saveClientInformation(T) {
    await this.storage.saveClientInfo(this.serverName, {
      clientId: T.client_id,
      clientSecret: T.client_secret,
      redirectUrl: this.redirectUrlValue,
      authUrl: "",
      tokenUrl: "",
      serverUrl: this.serverUrl
    }), J.info("Saved client information from DCR", {
      serverName: this.serverName,
      clientId: T.client_id
    });
  }
  async tokens() {
    let T = await this.storage.getTokens(this.serverName, this.serverUrl);
    if (!T) return;
    if ((T.expiresAt ? T.expiresAt < Date.now() : !1) && (!T.refreshToken || T.refreshToken === "")) {
      J.debug("Access token expired -- triggering new OAuth flow", {
        serverName: this.serverName
      });
      return;
    }
    return {
      access_token: T.accessToken,
      refresh_token: T.refreshToken,
      expires_in: T.expiresAt ? Math.max(0, Math.floor((T.expiresAt - Date.now()) / 1000)) : void 0,
      token_type: T.tokenType || "Bearer",
      scope: T.scopes?.join(" ")
    };
  }
  async saveTokens(T) {
    let R = T.expires_in ? Date.now() + T.expires_in * 1000 : void 0;
    await this.storage.saveTokens(this.serverName, {
      accessToken: T.access_token,
      refreshToken: T.refresh_token,
      expiresAt: R,
      tokenType: T.token_type,
      scopes: T.scope?.split(" ")
    }), J.info("Saved OAuth tokens to storage", {
      serverName: this.serverName,
      expiresAt: R ? new Date(R).toISOString() : "Never",
      hasRefreshToken: !!T.refresh_token
    });
  }
  async redirectToAuthorization(T) {
    J.debug("redirectToAuthorization called", {
      serverName: this.serverName,
      authorizationUrl: T.toString()
    });
    let R = this.serverName,
      a = RuT.get(R),
      e = a && Date.now() - a < xHR;
    if (this.authInProgress || e) {
      J.debug("Authorization already in progress, skipping browser open", {
        serverName: this.serverName,
        instanceFlag: this.authInProgress,
        flowStillActive: e,
        msSinceLastFlow: a ? Date.now() - a : void 0
      });
      return;
    }
    if (this.shouldInitiateOAuth && !this.shouldInitiateOAuth()) throw J.warn("shouldInitiateOAuth returned false, skipping OAuth browser open", {
      serverName: this.serverName
    }), new R4T(this.serverName);
    let t = await dj(this.serverName);
    if (!t.acquired) throw J.info("Another Amp instance is handling OAuth, will wait for tokens", {
      serverName: this.serverName,
      holderPid: t.holder.pid
    }), this.waitingOnLockHolder = t.holder.pid, this.onAuthStateChange?.("authenticating"), new Z0T(this.serverName, t.holder.pid);
    this.holdsLock = !0, this.authInProgress = !0, RuT.set(R, Date.now()), this.onAuthStateChange?.("authenticating"), this.pendingAuthorizationUrl = T, J.debug("Stored authorization URL for deferred browser open", {
      serverName: this.serverName,
      origin: T.origin
    });
  }
  async openBrowserForAuth() {
    if (!this.pendingAuthorizationUrl) return;
    let T = this.pendingAuthorizationUrl;
    if (this.pendingAuthorizationUrl = void 0, this.headlessAuthHandler) {
      J.info("Using headless OAuth flow - prompting for manual authorization", {
        serverName: this.serverName,
        origin: T.origin
      });
      try {
        let R = await this.headlessAuthHandler(T.toString(), this.redirectUrlValue);
        this.headlessAuthCode = this.extractAuthCodeFromResponse(R), J.info("Received authorization code from headless flow", {
          serverName: this.serverName
        });
      } catch (R) {
        throw J.error("Failed to get authorization from headless flow", {
          serverName: this.serverName,
          error: R instanceof Error ? R.message : String(R)
        }), R;
      }
      return;
    }
    J.info("Opening authorization URL in browser", {
      serverName: this.serverName,
      origin: T.origin
    });
    try {
      await Wb(T.toString()), J.info("Browser opened for OAuth authorization", {
        serverName: this.serverName
      });
    } catch (R) {
      throw J.error("Failed to open browser for OAuth", {
        serverName: this.serverName,
        error: R instanceof Error ? R.message : String(R)
      }), R;
    }
  }
  extractAuthCodeFromResponse(T) {
    let R = T.trim();
    if (R.startsWith("http://") || R.startsWith("https://")) try {
      let a = new URL(R),
        e = a.searchParams.get("state");
      if (this.currentState && e !== this.currentState) throw Error("Callback URL state does not match the active OAuth request. Use the callback URL from the currently selected OAuth prompt.");
      let t = a.searchParams.get("code");
      if (t) return J.debug("Extracted auth code from callback URL"), t;
      throw Error("No authorization code found in the URL");
    } catch (a) {
      if (a instanceof TypeError) throw Error("Invalid URL format");
      throw a;
    }
    return R;
  }
  async getAuthorizationCode() {
    if (this.headlessAuthCode) {
      let T = this.headlessAuthCode;
      return this.headlessAuthCode = void 0, J.info("Returning authorization code from headless flow", {
        serverName: this.serverName
      }), this.onAuthStateChange?.("completed"), T;
    }
    if (this.authCodePromise) return J.debug("Reusing existing auth code promise", {
      serverName: this.serverName
    }), this.authCodePromise;
    if (!this.currentState) throw Error("OAuth state not set - state() must be called before getAuthorizationCode");
    return this.authCodePromise = (async () => {
      let T = null;
      try {
        if (T = hz.waitForCallback(this.currentState), T.catch(() => {}), await this.openBrowserForAuth(), this.headlessAuthCode) {
          let a = this.headlessAuthCode;
          return this.headlessAuthCode = void 0, J.info("Returning authorization code from headless flow", {
            serverName: this.serverName
          }), this.onAuthStateChange?.("completed"), hz.cancelFlow(this.currentState), a;
        }
        let R = await T;
        if (R.state !== this.currentState) throw J.error("OAuth state mismatch - possible CSRF attack", {
          serverName: this.serverName,
          expected: this.currentState,
          received: R.state
        }), this.onAuthStateChange?.("failed"), Error(`OAuth state validation failed for ${this.serverName} - possible CSRF attack`);
        return J.info("OAuth authorization code received", {
          serverName: this.serverName
        }), this.onAuthStateChange?.("completed"), R.code;
      } catch (R) {
        throw this.onAuthStateChange?.("failed"), await this.cleanupOnFailure(), R;
      }
    })(), this.authCodePromise;
  }
  async saveCodeVerifier(T) {
    if (this.currentCodeVerifier) {
      if (this.currentCodeVerifier === T) {
        J.debug("Code verifier already set with same value", {
          serverName: this.serverName
        });
        return;
      }
      throw J.error("Cannot save code verifier - already set with different value", {
        serverName: this.serverName
      }), Error(`Cannot save code verifier for ${this.serverName}: verifier already set with different value. This indicates multiple OAuth flows running simultaneously, which should not happen.`);
    }
    this.currentCodeVerifier = T, J.info("Saved code verifier to memory", {
      serverName: this.serverName
    });
  }
  async codeVerifier() {
    if (J.debug("codeVerifier() called", {
      serverName: this.serverName,
      hasVerifier: !!this.currentCodeVerifier
    }), this.currentCodeVerifier) return this.currentCodeVerifier;
    throw Error("Code verifier not found - authorization flow not started");
  }
  async cleanupOnFailure() {
    if (J.info("Cleaning up OAuth data after failure", {
      serverName: this.serverName
    }), this.holdsLock) try {
      await ED(this.serverName), this.holdsLock = !1;
    } catch (T) {
      J.warn("Failed to release OAuth lock on failure", {
        serverName: this.serverName,
        error: T instanceof Error ? T.message : String(T)
      });
    }
    try {
      await this.storage.clearAll(this.serverName), J.debug("OAuth data cleared successfully", {
        serverName: this.serverName
      });
    } catch (T) {
      J.warn("Failed to cleanup OAuth data after failure", {
        serverName: this.serverName,
        error: T instanceof Error ? T.message : String(T)
      });
    }
    this.clientInfoSaved = !1, this.resetFlowState();
  }
  async releaseLockOnSuccess() {
    if (this.holdsLock) try {
      await ED(this.serverName), this.holdsLock = !1, J.debug("Released OAuth lock after success", {
        serverName: this.serverName
      });
    } catch (T) {
      J.warn("Failed to release OAuth lock on success", {
        serverName: this.serverName,
        error: T instanceof Error ? T.message : String(T)
      });
    }
  }
  async waitForTokensFromOtherInstance(T) {
    let R = Date.now();
    J.info("Waiting for OAuth tokens from another Amp instance", {
      serverName: this.serverName,
      holderPid: this.waitingOnLockHolder,
      timeoutMs: FW
    });
    while (Date.now() - R < FW) {
      if (T?.aborted) return J.debug("Token polling aborted", {
        serverName: this.serverName
      }), !1;
      if (await this.storage.getTokens(this.serverName, this.serverUrl)) return J.info("Found tokens saved by another Amp instance", {
        serverName: this.serverName,
        waitedMs: Date.now() - R
      }), this.waitingOnLockHolder = void 0, this.onAuthStateChange?.("completed"), !0;
      await new Promise(a => {
        let e = setTimeout(a, a4T);
        T?.addEventListener("abort", () => {
          clearTimeout(e), a();
        });
      });
    }
    return J.warn("Timed out waiting for tokens from another Amp instance", {
      serverName: this.serverName,
      holderPid: this.waitingOnLockHolder,
      timeoutMs: FW
    }), this.waitingOnLockHolder = void 0, this.onAuthStateChange?.("failed"), !1;
  }
  async invalidateCredentials(T) {
    J.info("Invalidating OAuth credentials", {
      serverName: this.serverName,
      scope: T
    });
    try {
      switch (T) {
        case "all":
          await this.storage.clearAll(this.serverName), this.currentCodeVerifier = void 0, this.clientInfoSaved = !1;
          break;
        case "client":
          await this.storage.clearClientInfo(this.serverName), this.clientInfoSaved = !1;
          break;
        case "tokens":
          await this.storage.clearTokens(this.serverName);
          break;
        case "verifier":
          this.currentCodeVerifier = void 0;
          break;
      }
      J.debug("OAuth credentials invalidated successfully", {
        serverName: this.serverName,
        scope: T
      });
    } catch (R) {
      J.warn("Failed to invalidate OAuth credentials", {
        serverName: this.serverName,
        scope: T,
        error: R instanceof Error ? R.message : String(R)
      });
    }
    this.resetFlowState();
  }
}