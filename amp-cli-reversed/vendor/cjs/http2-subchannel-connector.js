// Module: http2-subchannel-connector
// Original: shR
// Type: CJS (RT wrapper)
// Exports: Http2SubchannelConnector
// Category: util

// Module: shR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.Http2SubchannelConnector = void 0));
  var R = qT("http2"),
    a = Tk(),
    e = c8(),
    t = gvT(),
    r = j3(),
    h = jn(),
    i = mc(),
    c = dh(),
    s = qT("net"),
    A = chR(),
    l = vvT(),
    o = "transport",
    n = "transport_flowctrl",
    p = nvT().version,
    {
      HTTP2_HEADER_AUTHORITY: _,
      HTTP2_HEADER_CONTENT_TYPE: m,
      HTTP2_HEADER_METHOD: b,
      HTTP2_HEADER_PATH: y,
      HTTP2_HEADER_TE: u,
      HTTP2_HEADER_USER_AGENT: P,
    } = R.constants,
    k = 20000,
    x = Buffer.from("too_many_pings", "ascii");
  class f {
    constructor(g, I, S, O) {
      if (
        ((this.session = g),
        (this.options = S),
        (this.remoteName = O),
        (this.keepaliveTimer = null),
        (this.pendingSendKeepalivePing = !1),
        (this.activeCalls = new Set()),
        (this.disconnectListeners = []),
        (this.disconnectHandled = !1),
        (this.channelzEnabled = !0),
        (this.keepalivesSent = 0),
        (this.messagesSent = 0),
        (this.messagesReceived = 0),
        (this.lastMessageSentTimestamp = null),
        (this.lastMessageReceivedTimestamp = null),
        (this.subchannelAddressString = (0, i.subchannelAddressToString)(I)),
        S["grpc.enable_channelz"] === 0)
      )
        ((this.channelzEnabled = !1),
          (this.streamTracker = new a.ChannelzCallTrackerStub()));
      else this.streamTracker = new a.ChannelzCallTracker();
      if (
        ((this.channelzRef = (0, a.registerChannelzSocket)(
          this.subchannelAddressString,
          () => this.getChannelzInfo(),
          this.channelzEnabled,
        )),
        (this.userAgent = [
          S["grpc.primary_user_agent"],
          `grpc-node-js/${p}`,
          S["grpc.secondary_user_agent"],
        ]
          .filter((j) => j)
          .join(" ")),
        "grpc.keepalive_time_ms" in S)
      )
        this.keepaliveTimeMs = S["grpc.keepalive_time_ms"];
      else this.keepaliveTimeMs = -1;
      if ("grpc.keepalive_timeout_ms" in S)
        this.keepaliveTimeoutMs = S["grpc.keepalive_timeout_ms"];
      else this.keepaliveTimeoutMs = k;
      if ("grpc.keepalive_permit_without_calls" in S)
        this.keepaliveWithoutCalls =
          S["grpc.keepalive_permit_without_calls"] === 1;
      else this.keepaliveWithoutCalls = !1;
      if (
        (g.once("close", () => {
          (this.trace("session closed"), this.handleDisconnect());
        }),
        g.once("goaway", (j, d, C) => {
          let L = !1;
          if (j === R.constants.NGHTTP2_ENHANCE_YOUR_CALM && C && C.equals(x))
            L = !0;
          (this.trace(
            "connection closed by GOAWAY with code " +
              j +
              " and data " +
              (C === null || C === void 0 ? void 0 : C.toString()),
          ),
            this.reportDisconnectToOwner(L));
        }),
        g.once("error", (j) => {
          (this.trace("connection closed with error " + j.message),
            this.handleDisconnect());
        }),
        g.socket.once("close", (j) => {
          (this.trace("connection closed. hadError=" + j),
            this.handleDisconnect());
        }),
        r.isTracerEnabled(o))
      )
        (g.on("remoteSettings", (j) => {
          this.trace(
            "new settings received" +
              (this.session !== g ? " on the old connection" : "") +
              ": " +
              JSON.stringify(j),
          );
        }),
          g.on("localSettings", (j) => {
            this.trace(
              "local settings acknowledged by remote" +
                (this.session !== g ? " on the old connection" : "") +
                ": " +
                JSON.stringify(j),
            );
          }));
      if (this.keepaliveWithoutCalls) this.maybeStartKeepalivePingTimer();
    }
    getChannelzInfo() {
      var g, I, S;
      let O = this.session.socket,
        j = O.remoteAddress
          ? (0, i.stringToSubchannelAddress)(O.remoteAddress, O.remotePort)
          : null,
        d = O.localAddress
          ? (0, i.stringToSubchannelAddress)(O.localAddress, O.localPort)
          : null,
        C;
      if (this.session.encrypted) {
        let L = O,
          w = L.getCipher(),
          D = L.getCertificate(),
          B = L.getPeerCertificate();
        C = {
          cipherSuiteStandardName:
            (g = w.standardName) !== null && g !== void 0 ? g : null,
          cipherSuiteOtherName: w.standardName ? null : w.name,
          localCertificate: D && "raw" in D ? D.raw : null,
          remoteCertificate: B && "raw" in B ? B.raw : null,
        };
      } else C = null;
      return {
        remoteAddress: j,
        localAddress: d,
        security: C,
        remoteName: this.remoteName,
        streamsStarted: this.streamTracker.callsStarted,
        streamsSucceeded: this.streamTracker.callsSucceeded,
        streamsFailed: this.streamTracker.callsFailed,
        messagesSent: this.messagesSent,
        messagesReceived: this.messagesReceived,
        keepAlivesSent: this.keepalivesSent,
        lastLocalStreamCreatedTimestamp:
          this.streamTracker.lastCallStartedTimestamp,
        lastRemoteStreamCreatedTimestamp: null,
        lastMessageSentTimestamp: this.lastMessageSentTimestamp,
        lastMessageReceivedTimestamp: this.lastMessageReceivedTimestamp,
        localFlowControlWindow:
          (I = this.session.state.localWindowSize) !== null && I !== void 0
            ? I
            : null,
        remoteFlowControlWindow:
          (S = this.session.state.remoteWindowSize) !== null && S !== void 0
            ? S
            : null,
      };
    }
    trace(g) {
      r.trace(
        e.LogVerbosity.DEBUG,
        o,
        "(" +
          this.channelzRef.id +
          ") " +
          this.subchannelAddressString +
          " " +
          g,
      );
    }
    keepaliveTrace(g) {
      r.trace(
        e.LogVerbosity.DEBUG,
        "keepalive",
        "(" +
          this.channelzRef.id +
          ") " +
          this.subchannelAddressString +
          " " +
          g,
      );
    }
    flowControlTrace(g) {
      r.trace(
        e.LogVerbosity.DEBUG,
        n,
        "(" +
          this.channelzRef.id +
          ") " +
          this.subchannelAddressString +
          " " +
          g,
      );
    }
    internalsTrace(g) {
      r.trace(
        e.LogVerbosity.DEBUG,
        "transport_internals",
        "(" +
          this.channelzRef.id +
          ") " +
          this.subchannelAddressString +
          " " +
          g,
      );
    }
    reportDisconnectToOwner(g) {
      if (this.disconnectHandled) return;
      ((this.disconnectHandled = !0),
        this.disconnectListeners.forEach((I) => I(g)));
    }
    handleDisconnect() {
      (this.clearKeepaliveTimeout(), this.reportDisconnectToOwner(!1));
      for (let g of this.activeCalls) g.onDisconnect();
      setImmediate(() => {
        this.session.destroy();
      });
    }
    addDisconnectListener(g) {
      this.disconnectListeners.push(g);
    }
    canSendPing() {
      return (
        !this.session.destroyed &&
        this.keepaliveTimeMs > 0 &&
        (this.keepaliveWithoutCalls || this.activeCalls.size > 0)
      );
    }
    maybeSendPing() {
      var g, I;
      if (!this.canSendPing()) {
        this.pendingSendKeepalivePing = !0;
        return;
      }
      if (this.keepaliveTimer) {
        console.error("keepaliveTimeout is not null");
        return;
      }
      if (this.channelzEnabled) this.keepalivesSent += 1;
      (this.keepaliveTrace(
        "Sending ping with timeout " + this.keepaliveTimeoutMs + "ms",
      ),
        (this.keepaliveTimer = setTimeout(() => {
          ((this.keepaliveTimer = null),
            this.keepaliveTrace("Ping timeout passed without response"),
            this.handleDisconnect());
        }, this.keepaliveTimeoutMs)),
        (I = (g = this.keepaliveTimer).unref) === null ||
          I === void 0 ||
          I.call(g));
      let S = "";
      try {
        if (
          !this.session.ping((O, j, d) => {
            if ((this.clearKeepaliveTimeout(), O))
              (this.keepaliveTrace("Ping failed with error " + O.message),
                this.handleDisconnect());
            else
              (this.keepaliveTrace("Received ping response"),
                this.maybeStartKeepalivePingTimer());
          })
        )
          S = "Ping returned false";
      } catch (O) {
        S = (O instanceof Error ? O.message : "") || "Unknown error";
      }
      if (S)
        (this.keepaliveTrace("Ping send failed: " + S),
          this.handleDisconnect());
    }
    maybeStartKeepalivePingTimer() {
      var g, I;
      if (!this.canSendPing()) return;
      if (this.pendingSendKeepalivePing)
        ((this.pendingSendKeepalivePing = !1), this.maybeSendPing());
      else if (!this.keepaliveTimer)
        (this.keepaliveTrace(
          "Starting keepalive timer for " + this.keepaliveTimeMs + "ms",
        ),
          (this.keepaliveTimer = setTimeout(() => {
            ((this.keepaliveTimer = null), this.maybeSendPing());
          }, this.keepaliveTimeMs)),
          (I = (g = this.keepaliveTimer).unref) === null ||
            I === void 0 ||
            I.call(g));
    }
    clearKeepaliveTimeout() {
      if (this.keepaliveTimer)
        (clearTimeout(this.keepaliveTimer), (this.keepaliveTimer = null));
    }
    removeActiveCall(g) {
      if ((this.activeCalls.delete(g), this.activeCalls.size === 0))
        this.session.unref();
    }
    addActiveCall(g) {
      if ((this.activeCalls.add(g), this.activeCalls.size === 1)) {
        if ((this.session.ref(), !this.keepaliveWithoutCalls))
          this.maybeStartKeepalivePingTimer();
      }
    }
    createCall(g, I, S, O, j) {
      let d = g.toHttp2Headers();
      ((d[_] = I),
        (d[P] = this.userAgent),
        (d[m] = "application/grpc"),
        (d[b] = "POST"),
        (d[y] = S),
        (d[u] = "trailers"));
      let C;
      try {
        C = this.session.request(d);
      } catch (D) {
        throw (this.handleDisconnect(), D);
      }
      (this.flowControlTrace(
        "local window size: " +
          this.session.state.localWindowSize +
          " remote window size: " +
          this.session.state.remoteWindowSize,
      ),
        this.internalsTrace(
          "session.closed=" +
            this.session.closed +
            " session.destroyed=" +
            this.session.destroyed +
            " session.socket.destroyed=" +
            this.session.socket.destroyed,
        ));
      let L, w;
      if (this.channelzEnabled)
        (this.streamTracker.addCallStarted(),
          (L = {
            addMessageSent: () => {
              var D;
              ((this.messagesSent += 1),
                (this.lastMessageSentTimestamp = new Date()),
                (D = j.addMessageSent) === null || D === void 0 || D.call(j));
            },
            addMessageReceived: () => {
              var D;
              ((this.messagesReceived += 1),
                (this.lastMessageReceivedTimestamp = new Date()),
                (D = j.addMessageReceived) === null ||
                  D === void 0 ||
                  D.call(j));
            },
            onCallEnd: (D) => {
              var B;
              ((B = j.onCallEnd) === null || B === void 0 || B.call(j, D),
                this.removeActiveCall(w));
            },
            onStreamEnd: (D) => {
              var B;
              if (D) this.streamTracker.addCallSucceeded();
              else this.streamTracker.addCallFailed();
              (B = j.onStreamEnd) === null || B === void 0 || B.call(j, D);
            },
          }));
      else
        L = {
          addMessageSent: () => {
            var D;
            (D = j.addMessageSent) === null || D === void 0 || D.call(j);
          },
          addMessageReceived: () => {
            var D;
            (D = j.addMessageReceived) === null || D === void 0 || D.call(j);
          },
          onCallEnd: (D) => {
            var B;
            ((B = j.onCallEnd) === null || B === void 0 || B.call(j, D),
              this.removeActiveCall(w));
          },
          onStreamEnd: (D) => {
            var B;
            (B = j.onStreamEnd) === null || B === void 0 || B.call(j, D);
          },
        };
      return (
        (w = new A.Http2SubchannelCall(
          C,
          L,
          O,
          this,
          (0, l.getNextCallNumber)(),
        )),
        this.addActiveCall(w),
        w
      );
    }
    getChannelzRef() {
      return this.channelzRef;
    }
    getPeerName() {
      return this.subchannelAddressString;
    }
    getOptions() {
      return this.options;
    }
    shutdown() {
      (this.session.close(), (0, a.unregisterChannelzRef)(this.channelzRef));
    }
  }
  class v {
    constructor(g) {
      ((this.channelTarget = g), (this.session = null), (this.isShutdown = !1));
    }
    trace(g) {
      r.trace(
        e.LogVerbosity.DEBUG,
        o,
        (0, c.uriToString)(this.channelTarget) + " " + g,
      );
    }
    createSession(g, I, S) {
      if (this.isShutdown) return Promise.reject();
      if (g.socket.closed)
        return Promise.reject(
          "Connection closed before starting HTTP/2 handshake",
        );
      return new Promise((O, j) => {
        let d = null,
          C = this.channelTarget;
        if ("grpc.http_connect_target" in S) {
          let eT = (0, c.parseUri)(S["grpc.http_connect_target"]);
          if (eT) ((C = eT), (d = (0, c.uriToString)(eT)));
        }
        let L = g.secure ? "https" : "http",
          w = (0, h.getDefaultAuthority)(C),
          D = () => {
            var eT;
            ((eT = this.session) === null || eT === void 0 || eT.destroy(),
              (this.session = null),
              setImmediate(() => {
                if (!W)
                  ((W = !0), j(`${Q.trim()} (${new Date().toISOString()})`));
              }));
          },
          B = (eT) => {
            var iT;
            if (
              ((iT = this.session) === null || iT === void 0 || iT.destroy(),
              (Q = eT.message),
              this.trace("connection failed with error " + Q),
              !W)
            )
              ((W = !0), j(`${Q} (${new Date().toISOString()})`));
          },
          M = {
            createConnection: (eT, iT) => {
              return g.socket;
            },
          };
        if (S["grpc-node.flow_control_window"] !== void 0)
          M.settings = {
            initialWindowSize: S["grpc-node.flow_control_window"],
          };
        let V = R.connect(`${L}://${w}`, M);
        this.session = V;
        let Q = "Failed to connect",
          W = !1;
        (V.unref(),
          V.once("remoteSettings", () => {
            (V.removeAllListeners(),
              g.socket.removeListener("close", D),
              g.socket.removeListener("error", B),
              O(new f(V, I, S, d)),
              (this.session = null));
          }),
          V.once("close", D),
          V.once("error", B),
          g.socket.once("close", D),
          g.socket.once("error", B));
      });
    }
    tcpConnect(g, I) {
      return (0, t.getProxiedConnection)(g, I).then((S) => {
        if (S) return S;
        else
          return new Promise((O, j) => {
            let d = () => {
                j(Error("Socket closed"));
              },
              C = (w) => {
                j(w);
              },
              L = s.connect(g, () => {
                (L.removeListener("close", d),
                  L.removeListener("error", C),
                  O(L));
              });
            (L.once("close", d), L.once("error", C));
          });
      });
    }
    async connect(g, I, S) {
      if (this.isShutdown) return Promise.reject();
      let O = null,
        j = null,
        d = (0, i.subchannelAddressToString)(g);
      try {
        return (
          this.trace(d + " Waiting for secureConnector to be ready"),
          await I.waitForReady(),
          this.trace(d + " secureConnector is ready"),
          (O = await this.tcpConnect(g, S)),
          O.setNoDelay(),
          this.trace(d + " Established TCP connection"),
          (j = await I.connect(O)),
          this.trace(d + " Established secure connection"),
          this.createSession(j, g, S)
        );
      } catch (C) {
        throw (
          O === null || O === void 0 || O.destroy(),
          j === null || j === void 0 || j.socket.destroy(),
          C
        );
      }
    }
    shutdown() {
      var g;
      ((this.isShutdown = !0),
        (g = this.session) === null || g === void 0 || g.close(),
        (this.session = null));
    }
  }
  T.Http2SubchannelConnector = v;
};
