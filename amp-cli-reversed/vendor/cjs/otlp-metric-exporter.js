// Module: otlp-metric-exporter
// Original: BhR
// Type: CJS (RT wrapper)
// Exports: OTLPMetricExporter
// Category: util

// Module: bhR (CJS)
(T) => {
  var R =
      (T && T.__runInitializers) ||
      function (C, L, w) {
        var D = arguments.length > 2;
        for (var B = 0; B < L.length; B++)
          w = D ? L[B].call(C, w) : L[B].call(C);
        return D ? w : void 0;
      },
    a =
      (T && T.__esDecorate) ||
      function (C, L, w, D, B, M) {
        function V(q) {
          if (q !== void 0 && typeof q !== "function")
            throw TypeError("Function expected");
          return q;
        }
        var Q = D.kind,
          W = Q === "getter" ? "get" : Q === "setter" ? "set" : "value",
          eT = !L && C ? (D.static ? C : C.prototype) : null,
          iT = L || (eT ? Object.getOwnPropertyDescriptor(eT, D.name) : {}),
          aT,
          oT = !1;
        for (var TT = w.length - 1; TT >= 0; TT--) {
          var tT = {};
          for (var lT in D) tT[lT] = lT === "access" ? {} : D[lT];
          for (var lT in D.access) tT.access[lT] = D.access[lT];
          tT.addInitializer = function (q) {
            if (oT)
              throw TypeError(
                "Cannot add initializers after decoration has completed",
              );
            M.push(V(q || null));
          };
          var N = (0, w[TT])(
            Q === "accessor" ? { get: iT.get, set: iT.set } : iT[W],
            tT,
          );
          if (Q === "accessor") {
            if (N === void 0) continue;
            if (N === null || typeof N !== "object")
              throw TypeError("Object expected");
            if ((aT = V(N.get))) iT.get = aT;
            if ((aT = V(N.set))) iT.set = aT;
            if ((aT = V(N.init))) B.unshift(aT);
          } else if ((aT = V(N)))
            if (Q === "field") B.unshift(aT);
            else iT[W] = aT;
        }
        if (eT) Object.defineProperty(eT, D.name, iT);
        oT = !0;
      };
  (Object.defineProperty(T, "__esModule", { value: !0 }), (T.Server = void 0));
  var e = qT("http2"),
    t = qT("util"),
    r = c8(),
    h = _hR(),
    i = HZ(),
    c = jn(),
    s = j3(),
    A = mc(),
    l = dh(),
    o = Tk(),
    n = CvT(),
    p = 2147483647,
    _ = 2147483647,
    m = 20000,
    b = 2147483647,
    { HTTP2_HEADER_PATH: y } = e.constants,
    u = "server",
    P = Buffer.from("max_age");
  function k(C) {
    s.trace(r.LogVerbosity.DEBUG, "server_call", C);
  }
  function x() {}
  function f(C) {
    return function (L, w) {
      return t.deprecate(L, C);
    };
  }
  function v(C) {
    return {
      code: r.Status.UNIMPLEMENTED,
      details: `The server does not implement the method ${C}`,
    };
  }
  function g(C, L) {
    let w = v(L);
    switch (C) {
      case "unary":
        return (D, B) => {
          B(w, null);
        };
      case "clientStream":
        return (D, B) => {
          B(w, null);
        };
      case "serverStream":
        return (D) => {
          D.emit("error", w);
        };
      case "bidi":
        return (D) => {
          D.emit("error", w);
        };
      default:
        throw Error(`Invalid handlerType ${C}`);
    }
  }
  var I = (() => {
    var C;
    let L = [],
      w;
    return (
      (C = class {
        constructor(D) {
          var B, M, V, Q, W, eT;
          if (
            ((this.boundPorts = (R(this, L), new Map())),
            (this.http2Servers = new Map()),
            (this.sessionIdleTimeouts = new Map()),
            (this.handlers = new Map()),
            (this.sessions = new Map()),
            (this.started = !1),
            (this.shutdown = !1),
            (this.serverAddressString = "null"),
            (this.channelzEnabled = !0),
            (this.options = D !== null && D !== void 0 ? D : {}),
            this.options["grpc.enable_channelz"] === 0)
          )
            ((this.channelzEnabled = !1),
              (this.channelzTrace = new o.ChannelzTraceStub()),
              (this.callTracker = new o.ChannelzCallTrackerStub()),
              (this.listenerChildrenTracker =
                new o.ChannelzChildrenTrackerStub()),
              (this.sessionChildrenTracker =
                new o.ChannelzChildrenTrackerStub()));
          else
            ((this.channelzTrace = new o.ChannelzTrace()),
              (this.callTracker = new o.ChannelzCallTracker()),
              (this.listenerChildrenTracker = new o.ChannelzChildrenTracker()),
              (this.sessionChildrenTracker = new o.ChannelzChildrenTracker()));
          if (
            ((this.channelzRef = (0, o.registerChannelzServer)(
              "server",
              () => this.getChannelzInfo(),
              this.channelzEnabled,
            )),
            this.channelzTrace.addTrace("CT_INFO", "Server created"),
            (this.maxConnectionAgeMs =
              (B = this.options["grpc.max_connection_age_ms"]) !== null &&
              B !== void 0
                ? B
                : p),
            (this.maxConnectionAgeGraceMs =
              (M = this.options["grpc.max_connection_age_grace_ms"]) !== null &&
              M !== void 0
                ? M
                : p),
            (this.keepaliveTimeMs =
              (V = this.options["grpc.keepalive_time_ms"]) !== null &&
              V !== void 0
                ? V
                : _),
            (this.keepaliveTimeoutMs =
              (Q = this.options["grpc.keepalive_timeout_ms"]) !== null &&
              Q !== void 0
                ? Q
                : m),
            (this.sessionIdleTimeout =
              (W = this.options["grpc.max_connection_idle_ms"]) !== null &&
              W !== void 0
                ? W
                : b),
            (this.commonServerOptions = {
              maxSendHeaderBlockLength: Number.MAX_SAFE_INTEGER,
            }),
            "grpc-node.max_session_memory" in this.options)
          )
            this.commonServerOptions.maxSessionMemory =
              this.options["grpc-node.max_session_memory"];
          else
            this.commonServerOptions.maxSessionMemory = Number.MAX_SAFE_INTEGER;
          if ("grpc.max_concurrent_streams" in this.options)
            this.commonServerOptions.settings = {
              maxConcurrentStreams: this.options["grpc.max_concurrent_streams"],
            };
          ((this.interceptors =
            (eT = this.options.interceptors) !== null && eT !== void 0
              ? eT
              : []),
            this.trace("Server constructed"));
        }
        getChannelzInfo() {
          return {
            trace: this.channelzTrace,
            callTracker: this.callTracker,
            listenerChildren: this.listenerChildrenTracker.getChildLists(),
            sessionChildren: this.sessionChildrenTracker.getChildLists(),
          };
        }
        getChannelzSessionInfo(D) {
          var B, M, V;
          let Q = this.sessions.get(D),
            W = D.socket,
            eT = W.remoteAddress
              ? (0, A.stringToSubchannelAddress)(W.remoteAddress, W.remotePort)
              : null,
            iT = W.localAddress
              ? (0, A.stringToSubchannelAddress)(W.localAddress, W.localPort)
              : null,
            aT;
          if (D.encrypted) {
            let oT = W,
              TT = oT.getCipher(),
              tT = oT.getCertificate(),
              lT = oT.getPeerCertificate();
            aT = {
              cipherSuiteStandardName:
                (B = TT.standardName) !== null && B !== void 0 ? B : null,
              cipherSuiteOtherName: TT.standardName ? null : TT.name,
              localCertificate: tT && "raw" in tT ? tT.raw : null,
              remoteCertificate: lT && "raw" in lT ? lT.raw : null,
            };
          } else aT = null;
          return {
            remoteAddress: eT,
            localAddress: iT,
            security: aT,
            remoteName: null,
            streamsStarted: Q.streamTracker.callsStarted,
            streamsSucceeded: Q.streamTracker.callsSucceeded,
            streamsFailed: Q.streamTracker.callsFailed,
            messagesSent: Q.messagesSent,
            messagesReceived: Q.messagesReceived,
            keepAlivesSent: Q.keepAlivesSent,
            lastLocalStreamCreatedTimestamp: null,
            lastRemoteStreamCreatedTimestamp:
              Q.streamTracker.lastCallStartedTimestamp,
            lastMessageSentTimestamp: Q.lastMessageSentTimestamp,
            lastMessageReceivedTimestamp: Q.lastMessageReceivedTimestamp,
            localFlowControlWindow:
              (M = D.state.localWindowSize) !== null && M !== void 0 ? M : null,
            remoteFlowControlWindow:
              (V = D.state.remoteWindowSize) !== null && V !== void 0
                ? V
                : null,
          };
        }
        trace(D) {
          s.trace(
            r.LogVerbosity.DEBUG,
            u,
            "(" + this.channelzRef.id + ") " + D,
          );
        }
        keepaliveTrace(D) {
          s.trace(
            r.LogVerbosity.DEBUG,
            "keepalive",
            "(" + this.channelzRef.id + ") " + D,
          );
        }
        addProtoService() {
          throw Error("Not implemented. Use addService() instead");
        }
        addService(D, B) {
          if (
            D === null ||
            typeof D !== "object" ||
            B === null ||
            typeof B !== "object"
          )
            throw Error("addService() requires two objects as arguments");
          let M = Object.keys(D);
          if (M.length === 0)
            throw Error("Cannot add an empty service to a server");
          M.forEach((V) => {
            let Q = D[V],
              W;
            if (Q.requestStream)
              if (Q.responseStream) W = "bidi";
              else W = "clientStream";
            else if (Q.responseStream) W = "serverStream";
            else W = "unary";
            let eT = B[V],
              iT;
            if (eT === void 0 && typeof Q.originalName === "string")
              eT = B[Q.originalName];
            if (eT !== void 0) iT = eT.bind(B);
            else iT = g(W, V);
            if (
              this.register(
                Q.path,
                iT,
                Q.responseSerialize,
                Q.requestDeserialize,
                W,
              ) === !1
            )
              throw Error(`Method handler for ${Q.path} already provided.`);
          });
        }
        removeService(D) {
          if (D === null || typeof D !== "object")
            throw Error("removeService() requires object as argument");
          Object.keys(D).forEach((B) => {
            let M = D[B];
            this.unregister(M.path);
          });
        }
        bind(D, B) {
          throw Error("Not implemented. Use bindAsync() instead");
        }
        experimentalRegisterListenerToChannelz(D) {
          return (0, o.registerChannelzSocket)(
            (0, A.subchannelAddressToString)(D),
            () => {
              return {
                localAddress: D,
                remoteAddress: null,
                security: null,
                remoteName: null,
                streamsStarted: 0,
                streamsSucceeded: 0,
                streamsFailed: 0,
                messagesSent: 0,
                messagesReceived: 0,
                keepAlivesSent: 0,
                lastLocalStreamCreatedTimestamp: null,
                lastRemoteStreamCreatedTimestamp: null,
                lastMessageSentTimestamp: null,
                lastMessageReceivedTimestamp: null,
                localFlowControlWindow: null,
                remoteFlowControlWindow: null,
              };
            },
            this.channelzEnabled,
          );
        }
        experimentalUnregisterListenerFromChannelz(D) {
          (0, o.unregisterChannelzRef)(D);
        }
        createHttp2Server(D) {
          let B;
          if (D._isSecure()) {
            let M = D._getConstructorOptions(),
              V = D._getSecureContextOptions(),
              Q = Object.assign(
                Object.assign(
                  Object.assign(Object.assign({}, this.commonServerOptions), M),
                  V,
                ),
                {
                  enableTrace: this.options["grpc-node.tls_enable_trace"] === 1,
                },
              ),
              W = V !== null;
            (this.trace("Initial credentials valid: " + W),
              (B = e.createSecureServer(Q)),
              B.prependListener("connection", (iT) => {
                if (!W)
                  (this.trace(
                    "Dropped connection from " +
                      JSON.stringify(iT.address()) +
                      " due to unloaded credentials",
                  ),
                    iT.destroy());
              }),
              B.on("secureConnection", (iT) => {
                iT.on("error", (aT) => {
                  this.trace(
                    "An incoming TLS connection closed with error: " +
                      aT.message,
                  );
                });
              }));
            let eT = (iT) => {
              if (iT) {
                let aT = B;
                try {
                  aT.setSecureContext(iT);
                } catch (oT) {
                  (s.log(
                    r.LogVerbosity.ERROR,
                    "Failed to set secure context with error " + oT.message,
                  ),
                    (iT = null));
                }
              }
              ((W = iT !== null),
                this.trace("Post-update credentials valid: " + W));
            };
            (D._addWatcher(eT),
              B.on("close", () => {
                D._removeWatcher(eT);
              }));
          } else B = e.createServer(this.commonServerOptions);
          return (
            B.setTimeout(0, x),
            this._setupHandlers(B, D._getInterceptors()),
            B
          );
        }
        bindOneAddress(D, B) {
          this.trace(
            "Attempting to bind " + (0, A.subchannelAddressToString)(D),
          );
          let M = this.createHttp2Server(B.credentials);
          return new Promise((V, Q) => {
            let W = (eT) => {
              (this.trace(
                "Failed to bind " +
                  (0, A.subchannelAddressToString)(D) +
                  " with error " +
                  eT.message,
              ),
                V({ port: "port" in D ? D.port : 1, error: eT.message }));
            };
            (M.once("error", W),
              M.listen(D, () => {
                let eT = M.address(),
                  iT;
                if (typeof eT === "string") iT = { path: eT };
                else iT = { host: eT.address, port: eT.port };
                let aT = this.experimentalRegisterListenerToChannelz(iT);
                (this.listenerChildrenTracker.refChild(aT),
                  this.http2Servers.set(M, {
                    channelzRef: aT,
                    sessions: new Set(),
                    ownsChannelzRef: !0,
                  }),
                  B.listeningServers.add(M),
                  this.trace(
                    "Successfully bound " +
                      (0, A.subchannelAddressToString)(iT),
                  ),
                  V({ port: "port" in iT ? iT.port : 1 }),
                  M.removeListener("error", W));
              }));
          });
        }
        async bindManyPorts(D, B) {
          if (D.length === 0) return { count: 0, port: 0, errors: [] };
          if ((0, A.isTcpSubchannelAddress)(D[0]) && D[0].port === 0) {
            let M = await this.bindOneAddress(D[0], B);
            if (M.error) {
              let V = await this.bindManyPorts(D.slice(1), B);
              return Object.assign(Object.assign({}, V), {
                errors: [M.error, ...V.errors],
              });
            } else {
              let V = D.slice(1).map((eT) =>
                  (0, A.isTcpSubchannelAddress)(eT)
                    ? { host: eT.host, port: M.port }
                    : eT,
                ),
                Q = await Promise.all(
                  V.map((eT) => this.bindOneAddress(eT, B)),
                ),
                W = [M, ...Q];
              return {
                count: W.filter((eT) => eT.error === void 0).length,
                port: M.port,
                errors: W.filter((eT) => eT.error).map((eT) => eT.error),
              };
            }
          } else {
            let M = await Promise.all(D.map((V) => this.bindOneAddress(V, B)));
            return {
              count: M.filter((V) => V.error === void 0).length,
              port: M[0].port,
              errors: M.filter((V) => V.error).map((V) => V.error),
            };
          }
        }
        async bindAddressList(D, B) {
          let M = await this.bindManyPorts(D, B);
          if (M.count > 0) {
            if (M.count < D.length)
              s.log(
                r.LogVerbosity.INFO,
                `WARNING Only ${M.count} addresses added out of total ${D.length} resolved`,
              );
            return M.port;
          } else {
            let V = `No address added out of total ${D.length} resolved`;
            throw (
              s.log(r.LogVerbosity.ERROR, V),
              Error(`${V} errors: [${M.errors.join(",")}]`)
            );
          }
        }
        resolvePort(D) {
          return new Promise((B, M) => {
            let V = {
              onSuccessfulResolution: (Q, W, eT) => {
                V.onSuccessfulResolution = () => {};
                let iT = [].concat(...Q.map((aT) => aT.addresses));
                if (iT.length === 0) {
                  M(Error(`No addresses resolved for port ${D}`));
                  return;
                }
                B(iT);
              },
              onError: (Q) => {
                M(Error(Q.details));
              },
            };
            (0, c.createResolver)(D, V, this.options).updateResolution();
          });
        }
        async bindPort(D, B) {
          let M = await this.resolvePort(D);
          if (B.cancelled)
            throw (
              this.completeUnbind(B),
              Error("bindAsync operation cancelled by unbind call")
            );
          let V = await this.bindAddressList(M, B);
          if (B.cancelled)
            throw (
              this.completeUnbind(B),
              Error("bindAsync operation cancelled by unbind call")
            );
          return V;
        }
        normalizePort(D) {
          let B = (0, l.parseUri)(D);
          if (B === null) throw Error(`Could not parse port "${D}"`);
          let M = (0, c.mapUriDefaultScheme)(B);
          if (M === null)
            throw Error(`Could not get a default scheme for port "${D}"`);
          return M;
        }
        bindAsync(D, B, M) {
          if (this.shutdown) throw Error("bindAsync called after shutdown");
          if (typeof D !== "string") throw TypeError("port must be a string");
          if (B === null || !(B instanceof i.ServerCredentials))
            throw TypeError("creds must be a ServerCredentials object");
          if (typeof M !== "function")
            throw TypeError("callback must be a function");
          this.trace("bindAsync port=" + D);
          let V = this.normalizePort(D),
            Q = (aT, oT) => {
              process.nextTick(() => M(aT, oT));
            },
            W = this.boundPorts.get((0, l.uriToString)(V));
          if (W) {
            if (!B._equals(W.credentials)) {
              Q(Error(`${D} already bound with incompatible credentials`), 0);
              return;
            }
            if (((W.cancelled = !1), W.completionPromise))
              W.completionPromise.then(
                (aT) => M(null, aT),
                (aT) => M(aT, 0),
              );
            else Q(null, W.portNumber);
            return;
          }
          W = {
            mapKey: (0, l.uriToString)(V),
            originalUri: V,
            completionPromise: null,
            cancelled: !1,
            portNumber: 0,
            credentials: B,
            listeningServers: new Set(),
          };
          let eT = (0, l.splitHostPort)(V.path),
            iT = this.bindPort(V, W);
          if (
            ((W.completionPromise = iT),
            (eT === null || eT === void 0 ? void 0 : eT.port) === 0)
          )
            iT.then(
              (aT) => {
                let oT = {
                  scheme: V.scheme,
                  authority: V.authority,
                  path: (0, l.combineHostPort)({ host: eT.host, port: aT }),
                };
                ((W.mapKey = (0, l.uriToString)(oT)),
                  (W.completionPromise = null),
                  (W.portNumber = aT),
                  this.boundPorts.set(W.mapKey, W),
                  M(null, aT));
              },
              (aT) => {
                M(aT, 0);
              },
            );
          else
            (this.boundPorts.set(W.mapKey, W),
              iT.then(
                (aT) => {
                  ((W.completionPromise = null),
                    (W.portNumber = aT),
                    M(null, aT));
                },
                (aT) => {
                  M(aT, 0);
                },
              ));
        }
        registerInjectorToChannelz() {
          return (0, o.registerChannelzSocket)(
            "injector",
            () => {
              return {
                localAddress: null,
                remoteAddress: null,
                security: null,
                remoteName: null,
                streamsStarted: 0,
                streamsSucceeded: 0,
                streamsFailed: 0,
                messagesSent: 0,
                messagesReceived: 0,
                keepAlivesSent: 0,
                lastLocalStreamCreatedTimestamp: null,
                lastRemoteStreamCreatedTimestamp: null,
                lastMessageSentTimestamp: null,
                lastMessageReceivedTimestamp: null,
                localFlowControlWindow: null,
                remoteFlowControlWindow: null,
              };
            },
            this.channelzEnabled,
          );
        }
        experimentalCreateConnectionInjectorWithChannelzRef(D, B, M = !1) {
          if (D === null || !(D instanceof i.ServerCredentials))
            throw TypeError("creds must be a ServerCredentials object");
          if (this.channelzEnabled) this.listenerChildrenTracker.refChild(B);
          let V = this.createHttp2Server(D),
            Q = new Set();
          return (
            this.http2Servers.set(V, {
              channelzRef: B,
              sessions: Q,
              ownsChannelzRef: M,
            }),
            {
              injectConnection: (W) => {
                V.emit("connection", W);
              },
              drain: (W) => {
                var eT, iT;
                for (let aT of Q) this.closeSession(aT);
                (iT = (eT = setTimeout(() => {
                  for (let aT of Q) aT.destroy(e.constants.NGHTTP2_CANCEL);
                }, W)).unref) === null ||
                  iT === void 0 ||
                  iT.call(eT);
              },
              destroy: () => {
                this.closeServer(V);
                for (let W of Q) this.closeSession(W);
              },
            }
          );
        }
        createConnectionInjector(D) {
          if (D === null || !(D instanceof i.ServerCredentials))
            throw TypeError("creds must be a ServerCredentials object");
          let B = this.registerInjectorToChannelz();
          return this.experimentalCreateConnectionInjectorWithChannelzRef(
            D,
            B,
            !0,
          );
        }
        closeServer(D, B) {
          this.trace(
            "Closing server with address " + JSON.stringify(D.address()),
          );
          let M = this.http2Servers.get(D);
          D.close(() => {
            if (M && M.ownsChannelzRef)
              (this.listenerChildrenTracker.unrefChild(M.channelzRef),
                (0, o.unregisterChannelzRef)(M.channelzRef));
            (this.http2Servers.delete(D), B === null || B === void 0 || B());
          });
        }
        closeSession(D, B) {
          var M;
          this.trace(
            "Closing session initiated by " +
              ((M = D.socket) === null || M === void 0
                ? void 0
                : M.remoteAddress),
          );
          let V = this.sessions.get(D),
            Q = () => {
              if (V)
                (this.sessionChildrenTracker.unrefChild(V.ref),
                  (0, o.unregisterChannelzRef)(V.ref));
              B === null || B === void 0 || B();
            };
          if (D.closed) queueMicrotask(Q);
          else D.close(Q);
        }
        completeUnbind(D) {
          for (let B of D.listeningServers) {
            let M = this.http2Servers.get(B);
            if (
              (this.closeServer(B, () => {
                D.listeningServers.delete(B);
              }),
              M)
            )
              for (let V of M.sessions) this.closeSession(V);
          }
          this.boundPorts.delete(D.mapKey);
        }
        unbind(D) {
          this.trace("unbind port=" + D);
          let B = this.normalizePort(D),
            M = (0, l.splitHostPort)(B.path);
          if ((M === null || M === void 0 ? void 0 : M.port) === 0)
            throw Error("Cannot unbind port 0");
          let V = this.boundPorts.get((0, l.uriToString)(B));
          if (V)
            if (
              (this.trace(
                "unbinding " +
                  V.mapKey +
                  " originally bound as " +
                  (0, l.uriToString)(V.originalUri),
              ),
              V.completionPromise)
            )
              V.cancelled = !0;
            else this.completeUnbind(V);
        }
        drain(D, B) {
          var M, V;
          this.trace("drain port=" + D + " graceTimeMs=" + B);
          let Q = this.normalizePort(D),
            W = (0, l.splitHostPort)(Q.path);
          if ((W === null || W === void 0 ? void 0 : W.port) === 0)
            throw Error("Cannot drain port 0");
          let eT = this.boundPorts.get((0, l.uriToString)(Q));
          if (!eT) return;
          let iT = new Set();
          for (let aT of eT.listeningServers) {
            let oT = this.http2Servers.get(aT);
            if (oT)
              for (let TT of oT.sessions)
                (iT.add(TT),
                  this.closeSession(TT, () => {
                    iT.delete(TT);
                  }));
          }
          (V = (M = setTimeout(() => {
            for (let aT of iT) aT.destroy(e.constants.NGHTTP2_CANCEL);
          }, B)).unref) === null ||
            V === void 0 ||
            V.call(M);
        }
        forceShutdown() {
          for (let D of this.boundPorts.values()) D.cancelled = !0;
          this.boundPorts.clear();
          for (let D of this.http2Servers.keys()) this.closeServer(D);
          (this.sessions.forEach((D, B) => {
            (this.closeSession(B), B.destroy(e.constants.NGHTTP2_CANCEL));
          }),
            this.sessions.clear(),
            (0, o.unregisterChannelzRef)(this.channelzRef),
            (this.shutdown = !0));
        }
        register(D, B, M, V, Q) {
          if (this.handlers.has(D)) return !1;
          return (
            this.handlers.set(D, {
              func: B,
              serialize: M,
              deserialize: V,
              type: Q,
              path: D,
            }),
            !0
          );
        }
        unregister(D) {
          return this.handlers.delete(D);
        }
        start() {
          if (
            this.http2Servers.size === 0 ||
            [...this.http2Servers.keys()].every((D) => !D.listening)
          )
            throw Error("server must be bound in order to start");
          if (this.started === !0) throw Error("server is already started");
          this.started = !0;
        }
        tryShutdown(D) {
          var B;
          let M = (W) => {
              ((0, o.unregisterChannelzRef)(this.channelzRef), D(W));
            },
            V = 0;
          function Q() {
            if ((V--, V === 0)) M();
          }
          this.shutdown = !0;
          for (let [W, eT] of this.http2Servers.entries()) {
            V++;
            let iT = eT.channelzRef.name;
            (this.trace("Waiting for server " + iT + " to close"),
              this.closeServer(W, () => {
                (this.trace("Server " + iT + " finished closing"), Q());
              }));
            for (let aT of eT.sessions.keys()) {
              V++;
              let oT =
                (B = aT.socket) === null || B === void 0
                  ? void 0
                  : B.remoteAddress;
              (this.trace("Waiting for session " + oT + " to close"),
                this.closeSession(aT, () => {
                  (this.trace("Session " + oT + " finished closing"), Q());
                }));
            }
          }
          if (V === 0) M();
        }
        addHttp2Port() {
          throw Error("Not yet implemented");
        }
        getChannelzRef() {
          return this.channelzRef;
        }
        _verifyContentType(D, B) {
          let M = B[e.constants.HTTP2_HEADER_CONTENT_TYPE];
          if (typeof M !== "string" || !M.startsWith("application/grpc"))
            return (
              D.respond(
                {
                  [e.constants.HTTP2_HEADER_STATUS]:
                    e.constants.HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE,
                },
                { endStream: !0 },
              ),
              !1
            );
          return !0;
        }
        _retrieveHandler(D) {
          k(
            "Received call to method " +
              D +
              " at address " +
              this.serverAddressString,
          );
          let B = this.handlers.get(D);
          if (B === void 0)
            return (
              k(
                "No handler registered for method " +
                  D +
                  ". Sending UNIMPLEMENTED status.",
              ),
              null
            );
          return B;
        }
        _respondWithError(D, B, M = null) {
          var V, Q;
          let W = Object.assign(
            {
              "grpc-status":
                (V = D.code) !== null && V !== void 0 ? V : r.Status.INTERNAL,
              "grpc-message": D.details,
              [e.constants.HTTP2_HEADER_STATUS]: e.constants.HTTP_STATUS_OK,
              [e.constants.HTTP2_HEADER_CONTENT_TYPE]: "application/grpc+proto",
            },
            (Q = D.metadata) === null || Q === void 0
              ? void 0
              : Q.toHttp2Headers(),
          );
          (B.respond(W, { endStream: !0 }),
            this.callTracker.addCallFailed(),
            M === null || M === void 0 || M.streamTracker.addCallFailed());
        }
        _channelzHandler(D, B, M) {
          this.onStreamOpened(B);
          let V = this.sessions.get(B.session);
          if (
            (this.callTracker.addCallStarted(),
            V === null || V === void 0 || V.streamTracker.addCallStarted(),
            !this._verifyContentType(B, M))
          ) {
            (this.callTracker.addCallFailed(),
              V === null || V === void 0 || V.streamTracker.addCallFailed());
            return;
          }
          let Q = M[y],
            W = this._retrieveHandler(Q);
          if (!W) {
            this._respondWithError(v(Q), B, V);
            return;
          }
          let eT = {
              addMessageSent: () => {
                if (V)
                  ((V.messagesSent += 1),
                    (V.lastMessageSentTimestamp = new Date()));
              },
              addMessageReceived: () => {
                if (V)
                  ((V.messagesReceived += 1),
                    (V.lastMessageReceivedTimestamp = new Date()));
              },
              onCallEnd: (aT) => {
                if (aT.code === r.Status.OK)
                  this.callTracker.addCallSucceeded();
                else this.callTracker.addCallFailed();
              },
              onStreamEnd: (aT) => {
                if (V)
                  if (aT) V.streamTracker.addCallSucceeded();
                  else V.streamTracker.addCallFailed();
              },
            },
            iT = (0, n.getServerInterceptingCall)(
              [...D, ...this.interceptors],
              B,
              M,
              eT,
              W,
              this.options,
            );
          if (!this._runHandlerForCall(iT, W))
            (this.callTracker.addCallFailed(),
              V === null || V === void 0 || V.streamTracker.addCallFailed(),
              iT.sendStatus({
                code: r.Status.INTERNAL,
                details: `Unknown handler type: ${W.type}`,
              }));
        }
        _streamHandler(D, B, M) {
          if ((this.onStreamOpened(B), this._verifyContentType(B, M) !== !0))
            return;
          let V = M[y],
            Q = this._retrieveHandler(V);
          if (!Q) {
            this._respondWithError(v(V), B, null);
            return;
          }
          let W = (0, n.getServerInterceptingCall)(
            [...D, ...this.interceptors],
            B,
            M,
            null,
            Q,
            this.options,
          );
          if (!this._runHandlerForCall(W, Q))
            W.sendStatus({
              code: r.Status.INTERNAL,
              details: `Unknown handler type: ${Q.type}`,
            });
        }
        _runHandlerForCall(D, B) {
          let { type: M } = B;
          if (M === "unary") S(D, B);
          else if (M === "clientStream") O(D, B);
          else if (M === "serverStream") j(D, B);
          else if (M === "bidi") d(D, B);
          else return !1;
          return !0;
        }
        _setupHandlers(D, B) {
          if (D === null) return;
          let M = D.address(),
            V = "null";
          if (M)
            if (typeof M === "string") V = M;
            else V = M.address + ":" + M.port;
          this.serverAddressString = V;
          let Q = this.channelzEnabled
              ? this._channelzHandler
              : this._streamHandler,
            W = this.channelzEnabled
              ? this._channelzSessionHandler(D)
              : this._sessionHandler(D);
          (D.on("stream", Q.bind(this, B)), D.on("session", W));
        }
        _sessionHandler(D) {
          return (B) => {
            var M, V;
            (M = this.http2Servers.get(D)) === null ||
              M === void 0 ||
              M.sessions.add(B);
            let Q = null,
              W = null,
              eT = null,
              iT = !1,
              aT = this.enableIdleTimeout(B);
            if (this.maxConnectionAgeMs !== p) {
              let N = this.maxConnectionAgeMs / 10,
                q = Math.random() * N * 2 - N;
              ((Q = setTimeout(() => {
                var F, E;
                ((iT = !0),
                  this.trace(
                    "Connection dropped by max connection age: " +
                      ((F = B.socket) === null || F === void 0
                        ? void 0
                        : F.remoteAddress),
                  ));
                try {
                  B.goaway(e.constants.NGHTTP2_NO_ERROR, 2147483647, P);
                } catch (U) {
                  B.destroy();
                  return;
                }
                if ((B.close(), this.maxConnectionAgeGraceMs !== p))
                  ((W = setTimeout(() => {
                    B.destroy();
                  }, this.maxConnectionAgeGraceMs)),
                    (E = W.unref) === null || E === void 0 || E.call(W));
              }, this.maxConnectionAgeMs + q)),
                (V = Q.unref) === null || V === void 0 || V.call(Q));
            }
            let oT = () => {
                if (eT) (clearTimeout(eT), (eT = null));
              },
              TT = () => {
                return (
                  !B.destroyed &&
                  this.keepaliveTimeMs < _ &&
                  this.keepaliveTimeMs > 0
                );
              },
              tT,
              lT = () => {
                var N;
                if (!TT()) return;
                (this.keepaliveTrace(
                  "Starting keepalive timer for " + this.keepaliveTimeMs + "ms",
                ),
                  (eT = setTimeout(() => {
                    (oT(), tT());
                  }, this.keepaliveTimeMs)),
                  (N = eT.unref) === null || N === void 0 || N.call(eT));
              };
            ((tT = () => {
              var N;
              if (!TT()) return;
              this.keepaliveTrace(
                "Sending ping with timeout " + this.keepaliveTimeoutMs + "ms",
              );
              let q = "";
              try {
                if (
                  !B.ping((F, E, U) => {
                    if ((oT(), F))
                      (this.keepaliveTrace(
                        "Ping failed with error: " + F.message,
                      ),
                        (iT = !0),
                        B.close());
                    else (this.keepaliveTrace("Received ping response"), lT());
                  })
                )
                  q = "Ping returned false";
              } catch (F) {
                q = (F instanceof Error ? F.message : "") || "Unknown error";
              }
              if (q) {
                (this.keepaliveTrace("Ping send failed: " + q),
                  this.trace("Connection dropped due to ping send error: " + q),
                  (iT = !0),
                  B.close());
                return;
              }
              ((eT = setTimeout(() => {
                (oT(),
                  this.keepaliveTrace("Ping timeout passed without response"),
                  this.trace("Connection dropped by keepalive timeout"),
                  (iT = !0),
                  B.close());
              }, this.keepaliveTimeoutMs)),
                (N = eT.unref) === null || N === void 0 || N.call(eT));
            }),
              lT(),
              B.on("close", () => {
                var N, q;
                if (!iT)
                  this.trace(
                    `Connection dropped by client ${(N = B.socket) === null || N === void 0 ? void 0 : N.remoteAddress}`,
                  );
                if (Q) clearTimeout(Q);
                if (W) clearTimeout(W);
                if ((oT(), aT !== null))
                  (clearTimeout(aT.timeout),
                    this.sessionIdleTimeouts.delete(B));
                (q = this.http2Servers.get(D)) === null ||
                  q === void 0 ||
                  q.sessions.delete(B);
              }));
          };
        }
        _channelzSessionHandler(D) {
          return (B) => {
            var M, V, Q, W;
            let eT = (0, o.registerChannelzSocket)(
                (V =
                  (M = B.socket) === null || M === void 0
                    ? void 0
                    : M.remoteAddress) !== null && V !== void 0
                  ? V
                  : "unknown",
                this.getChannelzSessionInfo.bind(this, B),
                this.channelzEnabled,
              ),
              iT = {
                ref: eT,
                streamTracker: new o.ChannelzCallTracker(),
                messagesSent: 0,
                messagesReceived: 0,
                keepAlivesSent: 0,
                lastMessageSentTimestamp: null,
                lastMessageReceivedTimestamp: null,
              };
            ((Q = this.http2Servers.get(D)) === null ||
              Q === void 0 ||
              Q.sessions.add(B),
              this.sessions.set(B, iT));
            let aT = `${B.socket.remoteAddress}:${B.socket.remotePort}`;
            (this.channelzTrace.addTrace(
              "CT_INFO",
              "Connection established by client " + aT,
            ),
              this.trace("Connection established by client " + aT),
              this.sessionChildrenTracker.refChild(eT));
            let oT = null,
              TT = null,
              tT = null,
              lT = !1,
              N = this.enableIdleTimeout(B);
            if (this.maxConnectionAgeMs !== p) {
              let Z = this.maxConnectionAgeMs / 10,
                X = Math.random() * Z * 2 - Z;
              ((oT = setTimeout(() => {
                var rT;
                ((lT = !0),
                  this.channelzTrace.addTrace(
                    "CT_INFO",
                    "Connection dropped by max connection age from " + aT,
                  ));
                try {
                  B.goaway(e.constants.NGHTTP2_NO_ERROR, 2147483647, P);
                } catch (hT) {
                  B.destroy();
                  return;
                }
                if ((B.close(), this.maxConnectionAgeGraceMs !== p))
                  ((TT = setTimeout(() => {
                    B.destroy();
                  }, this.maxConnectionAgeGraceMs)),
                    (rT = TT.unref) === null || rT === void 0 || rT.call(TT));
              }, this.maxConnectionAgeMs + X)),
                (W = oT.unref) === null || W === void 0 || W.call(oT));
            }
            let q = () => {
                if (tT) (clearTimeout(tT), (tT = null));
              },
              F = () => {
                return (
                  !B.destroyed &&
                  this.keepaliveTimeMs < _ &&
                  this.keepaliveTimeMs > 0
                );
              },
              E,
              U = () => {
                var Z;
                if (!F()) return;
                (this.keepaliveTrace(
                  "Starting keepalive timer for " + this.keepaliveTimeMs + "ms",
                ),
                  (tT = setTimeout(() => {
                    (q(), E());
                  }, this.keepaliveTimeMs)),
                  (Z = tT.unref) === null || Z === void 0 || Z.call(tT));
              };
            ((E = () => {
              var Z;
              if (!F()) return;
              this.keepaliveTrace(
                "Sending ping with timeout " + this.keepaliveTimeoutMs + "ms",
              );
              let X = "";
              try {
                if (
                  !B.ping((rT, hT, pT) => {
                    if ((q(), rT))
                      (this.keepaliveTrace(
                        "Ping failed with error: " + rT.message,
                      ),
                        this.channelzTrace.addTrace(
                          "CT_INFO",
                          "Connection dropped due to error of a ping frame " +
                            rT.message +
                            " return in " +
                            hT,
                        ),
                        (lT = !0),
                        B.close());
                    else (this.keepaliveTrace("Received ping response"), U());
                  })
                )
                  X = "Ping returned false";
              } catch (rT) {
                X = (rT instanceof Error ? rT.message : "") || "Unknown error";
              }
              if (X) {
                (this.keepaliveTrace("Ping send failed: " + X),
                  this.channelzTrace.addTrace(
                    "CT_INFO",
                    "Connection dropped due to ping send error: " + X,
                  ),
                  (lT = !0),
                  B.close());
                return;
              }
              ((iT.keepAlivesSent += 1),
                (tT = setTimeout(() => {
                  (q(),
                    this.keepaliveTrace("Ping timeout passed without response"),
                    this.channelzTrace.addTrace(
                      "CT_INFO",
                      "Connection dropped by keepalive timeout from " + aT,
                    ),
                    (lT = !0),
                    B.close());
                }, this.keepaliveTimeoutMs)),
                (Z = tT.unref) === null || Z === void 0 || Z.call(tT));
            }),
              U(),
              B.on("close", () => {
                var Z;
                if (!lT)
                  this.channelzTrace.addTrace(
                    "CT_INFO",
                    "Connection dropped by client " + aT,
                  );
                if (
                  (this.sessionChildrenTracker.unrefChild(eT),
                  (0, o.unregisterChannelzRef)(eT),
                  oT)
                )
                  clearTimeout(oT);
                if (TT) clearTimeout(TT);
                if ((q(), N !== null))
                  (clearTimeout(N.timeout), this.sessionIdleTimeouts.delete(B));
                ((Z = this.http2Servers.get(D)) === null ||
                  Z === void 0 ||
                  Z.sessions.delete(B),
                  this.sessions.delete(B));
              }));
          };
        }
        enableIdleTimeout(D) {
          var B, M;
          if (this.sessionIdleTimeout >= b) return null;
          let V = {
            activeStreams: 0,
            lastIdle: Date.now(),
            onClose: this.onStreamClose.bind(this, D),
            timeout: setTimeout(
              this.onIdleTimeout,
              this.sessionIdleTimeout,
              this,
              D,
            ),
          };
          ((M = (B = V.timeout).unref) === null || M === void 0 || M.call(B),
            this.sessionIdleTimeouts.set(D, V));
          let { socket: Q } = D;
          return (
            this.trace(
              "Enable idle timeout for " + Q.remoteAddress + ":" + Q.remotePort,
            ),
            V
          );
        }
        onIdleTimeout(D, B) {
          let { socket: M } = B,
            V = D.sessionIdleTimeouts.get(B);
          if (V !== void 0 && V.activeStreams === 0)
            if (Date.now() - V.lastIdle >= D.sessionIdleTimeout)
              (D.trace(
                "Session idle timeout triggered for " +
                  (M === null || M === void 0 ? void 0 : M.remoteAddress) +
                  ":" +
                  (M === null || M === void 0 ? void 0 : M.remotePort) +
                  " last idle at " +
                  V.lastIdle,
              ),
                D.closeSession(B));
            else V.timeout.refresh();
        }
        onStreamOpened(D) {
          let B = D.session,
            M = this.sessionIdleTimeouts.get(B);
          if (M) ((M.activeStreams += 1), D.once("close", M.onClose));
        }
        onStreamClose(D) {
          var B, M;
          let V = this.sessionIdleTimeouts.get(D);
          if (V) {
            if (((V.activeStreams -= 1), V.activeStreams === 0))
              ((V.lastIdle = Date.now()),
                V.timeout.refresh(),
                this.trace(
                  "Session onStreamClose" +
                    ((B = D.socket) === null || B === void 0
                      ? void 0
                      : B.remoteAddress) +
                    ":" +
                    ((M = D.socket) === null || M === void 0
                      ? void 0
                      : M.remotePort) +
                    " at " +
                    V.lastIdle,
                ));
          }
        }
      }),
      (() => {
        let D =
          typeof Symbol === "function" && Symbol.metadata
            ? Object.create(null)
            : void 0;
        if (
          ((w = [
            f(
              "Calling start() is no longer necessary. It can be safely omitted.",
            ),
          ]),
          a(
            C,
            null,
            w,
            {
              kind: "method",
              name: "start",
              static: !1,
              private: !1,
              access: { has: (B) => "start" in B, get: (B) => B.start },
              metadata: D,
            },
            null,
            L,
          ),
          D)
        )
          Object.defineProperty(C, Symbol.metadata, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: D,
          });
      })(),
      C
    );
  })();
  T.Server = I;
  async function S(C, L) {
    let w;
    function D(V, Q, W, eT) {
      if (V) {
        C.sendStatus((0, h.serverErrorToStatus)(V, W));
        return;
      }
      C.sendMessage(Q, () => {
        C.sendStatus({
          code: r.Status.OK,
          details: "OK",
          metadata: W !== null && W !== void 0 ? W : null,
        });
      });
    }
    let B,
      M = null;
    C.start({
      onReceiveMetadata(V) {
        ((B = V), C.startRead());
      },
      onReceiveMessage(V) {
        if (M) {
          C.sendStatus({
            code: r.Status.UNIMPLEMENTED,
            details: `Received a second request message for server streaming method ${L.path}`,
            metadata: null,
          });
          return;
        }
        ((M = V), C.startRead());
      },
      onReceiveHalfClose() {
        if (!M) {
          C.sendStatus({
            code: r.Status.UNIMPLEMENTED,
            details: `Received no request message for server streaming method ${L.path}`,
            metadata: null,
          });
          return;
        }
        w = new h.ServerWritableStreamImpl(L.path, C, B, M);
        try {
          L.func(w, D);
        } catch (V) {
          C.sendStatus({
            code: r.Status.UNKNOWN,
            details: `Server method handler threw error ${V.message}`,
            metadata: null,
          });
        }
      },
      onCancel() {
        if (w) ((w.cancelled = !0), w.emit("cancelled", "cancelled"));
      },
    });
  }
  function O(C, L) {
    let w;
    function D(B, M, V, Q) {
      if (B) {
        C.sendStatus((0, h.serverErrorToStatus)(B, V));
        return;
      }
      C.sendMessage(M, () => {
        C.sendStatus({
          code: r.Status.OK,
          details: "OK",
          metadata: V !== null && V !== void 0 ? V : null,
        });
      });
    }
    C.start({
      onReceiveMetadata(B) {
        w = new h.ServerDuplexStreamImpl(L.path, C, B);
        try {
          L.func(w, D);
        } catch (M) {
          C.sendStatus({
            code: r.Status.UNKNOWN,
            details: `Server method handler threw error ${M.message}`,
            metadata: null,
          });
        }
      },
      onReceiveMessage(B) {
        w.push(B);
      },
      onReceiveHalfClose() {
        w.push(null);
      },
      onCancel() {
        if (w)
          ((w.cancelled = !0), w.emit("cancelled", "cancelled"), w.destroy());
      },
    });
  }
  function j(C, L) {
    let w,
      D,
      B = null;
    C.start({
      onReceiveMetadata(M) {
        ((D = M), C.startRead());
      },
      onReceiveMessage(M) {
        if (B) {
          C.sendStatus({
            code: r.Status.UNIMPLEMENTED,
            details: `Received a second request message for server streaming method ${L.path}`,
            metadata: null,
          });
          return;
        }
        ((B = M), C.startRead());
      },
      onReceiveHalfClose() {
        if (!B) {
          C.sendStatus({
            code: r.Status.UNIMPLEMENTED,
            details: `Received no request message for server streaming method ${L.path}`,
            metadata: null,
          });
          return;
        }
        w = new h.ServerWritableStreamImpl(L.path, C, D, B);
        try {
          L.func(w);
        } catch (M) {
          C.sendStatus({
            code: r.Status.UNKNOWN,
            details: `Server method handler threw error ${M.message}`,
            metadata: null,
          });
        }
      },
      onCancel() {
        if (w)
          ((w.cancelled = !0), w.emit("cancelled", "cancelled"), w.destroy());
      },
    });
  }
  function d(C, L) {
    let w;
    C.start({
      onReceiveMetadata(D) {
        w = new h.ServerDuplexStreamImpl(L.path, C, D);
        try {
          L.func(w);
        } catch (B) {
          C.sendStatus({
            code: r.Status.UNKNOWN,
            details: `Server method handler threw error ${B.message}`,
            metadata: null,
          });
        }
      },
      onReceiveMessage(D) {
        w.push(D);
      },
      onReceiveHalfClose() {
        w.push(null);
      },
      onCancel() {
        if (w)
          ((w.cancelled = !0), w.emit("cancelled", "cancelled"), w.destroy());
      },
    });
  }
};
