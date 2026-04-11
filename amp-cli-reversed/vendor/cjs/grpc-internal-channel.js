// Module: grpc-internal-channel
// Original: dvT
// Type: CJS (RT wrapper)
// Exports: InternalChannel, SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX
// Category: npm-pkg

// Module: dvT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.InternalChannel = T.SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX = void 0));
  var R = HB(),
    a = HrR(),
    e = ohR(),
    t = rm(),
    r = Yt(),
    h = c8(),
    i = jvT(),
    c = nhR(),
    s = jn(),
    A = j3(),
    l = gvT(),
    o = dh(),
    n = Ic(),
    p = Tk(),
    _ = lhR(),
    m = qB(),
    b = AhR(),
    y = vvT(),
    u = NZ(),
    P = phR(),
    k = UZ(),
    x = 2147483647,
    f = 1000,
    v = 1800000,
    g = new Map(),
    I = 16777216,
    S = 1048576;
  class O extends k.BaseSubchannelWrapper {
    constructor(L, w) {
      super(L);
      ((this.channel = w),
        (this.refCount = 0),
        (this.subchannelStateListener = (D, B, M, V) => {
          w.throttleKeepalive(V);
        }));
    }
    ref() {
      if (this.refCount === 0)
        (this.child.addConnectivityStateListener(this.subchannelStateListener),
          this.channel.addWrappedSubchannel(this));
      (this.child.ref(), (this.refCount += 1));
    }
    unref() {
      if ((this.child.unref(), (this.refCount -= 1), this.refCount <= 0))
        (this.child.removeConnectivityStateListener(
          this.subchannelStateListener,
        ),
          this.channel.removeWrappedSubchannel(this));
    }
  }
  class j {
    pick(L) {
      return {
        pickResultType: t.PickResultType.DROP,
        status: {
          code: h.Status.UNAVAILABLE,
          details: "Channel closed before call started",
          metadata: new r.Metadata(),
        },
        subchannel: null,
        onCallStarted: null,
        onCallEnded: null,
      };
    }
  }
  T.SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX = "grpc.internal.no_subchannel";
  class d {
    constructor(L) {
      ((this.target = L),
        (this.trace = new p.ChannelzTrace()),
        (this.callTracker = new p.ChannelzCallTracker()),
        (this.childrenTracker = new p.ChannelzChildrenTracker()),
        (this.state = n.ConnectivityState.IDLE));
    }
    getChannelzInfoCallback() {
      return () => {
        return {
          target: this.target,
          state: this.state,
          trace: this.trace,
          callTracker: this.callTracker,
          children: this.childrenTracker.getChildLists(),
        };
      };
    }
  }
  class C {
    constructor(L, w, D) {
      var B, M, V, Q, W, eT;
      if (
        ((this.credentials = w),
        (this.options = D),
        (this.connectivityState = n.ConnectivityState.IDLE),
        (this.currentPicker = new t.UnavailablePicker()),
        (this.configSelectionQueue = []),
        (this.pickQueue = []),
        (this.connectivityStateWatchers = []),
        (this.callRefTimer = null),
        (this.configSelector = null),
        (this.currentResolutionError = null),
        (this.wrappedSubchannels = new Set()),
        (this.callCount = 0),
        (this.idleTimer = null),
        (this.channelzEnabled = !0),
        (this.randomChannelId = Math.floor(
          Math.random() * Number.MAX_SAFE_INTEGER,
        )),
        typeof L !== "string")
      )
        throw TypeError("Channel target must be a string");
      if (!(w instanceof R.ChannelCredentials))
        throw TypeError(
          "Channel credentials must be a ChannelCredentials object",
        );
      if (D) {
        if (typeof D !== "object")
          throw TypeError("Channel options must be an object");
      }
      this.channelzInfoTracker = new d(L);
      let iT = (0, o.parseUri)(L);
      if (iT === null) throw Error(`Could not parse target name "${L}"`);
      let aT = (0, s.mapUriDefaultScheme)(iT);
      if (aT === null)
        throw Error(`Could not find a default scheme for target name "${L}"`);
      if (this.options["grpc.enable_channelz"] === 0) this.channelzEnabled = !1;
      if (
        ((this.channelzRef = (0, p.registerChannelzChannel)(
          L,
          this.channelzInfoTracker.getChannelzInfoCallback(),
          this.channelzEnabled,
        )),
        this.channelzEnabled)
      )
        this.channelzInfoTracker.trace.addTrace("CT_INFO", "Channel created");
      if (this.options["grpc.default_authority"])
        this.defaultAuthority = this.options["grpc.default_authority"];
      else this.defaultAuthority = (0, s.getDefaultAuthority)(aT);
      let oT = (0, l.mapProxyName)(aT, D);
      ((this.target = oT.target),
        (this.options = Object.assign({}, this.options, oT.extraOptions)),
        (this.subchannelPool = (0, e.getSubchannelPool)(
          ((B = this.options["grpc.use_local_subchannel_pool"]) !== null &&
          B !== void 0
            ? B
            : 0) === 0,
        )),
        (this.retryBufferTracker = new P.MessageBufferTracker(
          (M = this.options["grpc.retry_buffer_size"]) !== null && M !== void 0
            ? M
            : I,
          (V = this.options["grpc.per_rpc_retry_buffer_size"]) !== null &&
            V !== void 0
            ? V
            : S,
        )),
        (this.keepaliveTime =
          (Q = this.options["grpc.keepalive_time_ms"]) !== null && Q !== void 0
            ? Q
            : -1),
        (this.idleTimeoutMs = Math.max(
          (W = this.options["grpc.client_idle_timeout_ms"]) !== null &&
            W !== void 0
            ? W
            : v,
          f,
        )));
      let TT = {
        createSubchannel: (lT, N) => {
          let q = {};
          for (let [E, U] of Object.entries(N))
            if (!E.startsWith(T.SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX)) q[E] = U;
          let F = this.subchannelPool.getOrCreateSubchannel(
            this.target,
            lT,
            q,
            this.credentials,
          );
          if ((F.throttleKeepalive(this.keepaliveTime), this.channelzEnabled))
            this.channelzInfoTracker.trace.addTrace(
              "CT_INFO",
              "Created subchannel or used existing subchannel",
              F.getChannelzRef(),
            );
          return new O(F, this);
        },
        updateState: (lT, N) => {
          this.currentPicker = N;
          let q = this.pickQueue.slice();
          if (((this.pickQueue = []), q.length > 0)) this.callRefTimerUnref();
          for (let F of q) F.doPick();
          this.updateState(lT);
        },
        requestReresolution: () => {
          throw Error(
            "Resolving load balancer should never call requestReresolution",
          );
        },
        addChannelzChild: (lT) => {
          if (this.channelzEnabled)
            this.channelzInfoTracker.childrenTracker.refChild(lT);
        },
        removeChannelzChild: (lT) => {
          if (this.channelzEnabled)
            this.channelzInfoTracker.childrenTracker.unrefChild(lT);
        },
      };
      ((this.resolvingLoadBalancer = new a.ResolvingLoadBalancer(
        this.target,
        TT,
        this.options,
        (lT, N) => {
          var q;
          if (lT.retryThrottling)
            g.set(
              this.getTarget(),
              new P.RetryThrottler(
                lT.retryThrottling.maxTokens,
                lT.retryThrottling.tokenRatio,
                g.get(this.getTarget()),
              ),
            );
          else g.delete(this.getTarget());
          if (this.channelzEnabled)
            this.channelzInfoTracker.trace.addTrace(
              "CT_INFO",
              "Address resolution succeeded",
            );
          ((q = this.configSelector) === null || q === void 0 || q.unref(),
            (this.configSelector = N),
            (this.currentResolutionError = null),
            process.nextTick(() => {
              let F = this.configSelectionQueue;
              if (((this.configSelectionQueue = []), F.length > 0))
                this.callRefTimerUnref();
              for (let E of F) E.getConfig();
            }));
        },
        (lT) => {
          if (this.channelzEnabled)
            this.channelzInfoTracker.trace.addTrace(
              "CT_WARNING",
              "Address resolution failed with code " +
                lT.code +
                ' and details "' +
                lT.details +
                '"',
            );
          if (this.configSelectionQueue.length > 0)
            this.trace(
              "Name resolution failed with calls queued for config selection",
            );
          if (this.configSelector === null)
            this.currentResolutionError = Object.assign(
              Object.assign(
                {},
                (0, u.restrictControlPlaneStatusCode)(lT.code, lT.details),
              ),
              { metadata: lT.metadata },
            );
          let N = this.configSelectionQueue;
          if (((this.configSelectionQueue = []), N.length > 0))
            this.callRefTimerUnref();
          for (let q of N) q.reportResolverError(lT);
        },
      )),
        (this.filterStackFactory = new i.FilterStackFactory([
          new c.CompressionFilterFactory(this, this.options),
        ])),
        this.trace(
          "Channel constructed with options " + JSON.stringify(D, void 0, 2),
        ));
      let tT = Error();
      if ((0, A.isTracerEnabled)("channel_stacktrace"))
        (0, A.trace)(
          h.LogVerbosity.DEBUG,
          "channel_stacktrace",
          "(" +
            this.channelzRef.id +
            `) Channel constructed 
` +
            ((eT = tT.stack) === null || eT === void 0
              ? void 0
              : eT.substring(
                  tT.stack.indexOf(`
`) + 1,
                )),
        );
      this.lastActivityTimestamp = new Date();
    }
    trace(L, w) {
      (0, A.trace)(
        w !== null && w !== void 0 ? w : h.LogVerbosity.DEBUG,
        "channel",
        "(" +
          this.channelzRef.id +
          ") " +
          (0, o.uriToString)(this.target) +
          " " +
          L,
      );
    }
    callRefTimerRef() {
      var L, w, D, B;
      if (!this.callRefTimer) this.callRefTimer = setInterval(() => {}, x);
      if (
        !((w = (L = this.callRefTimer).hasRef) === null || w === void 0
          ? void 0
          : w.call(L))
      )
        (this.trace(
          "callRefTimer.ref | configSelectionQueue.length=" +
            this.configSelectionQueue.length +
            " pickQueue.length=" +
            this.pickQueue.length,
        ),
          (B = (D = this.callRefTimer).ref) === null ||
            B === void 0 ||
            B.call(D));
    }
    callRefTimerUnref() {
      var L, w, D;
      if (
        !((L = this.callRefTimer) === null || L === void 0
          ? void 0
          : L.hasRef) ||
        this.callRefTimer.hasRef()
      )
        (this.trace(
          "callRefTimer.unref | configSelectionQueue.length=" +
            this.configSelectionQueue.length +
            " pickQueue.length=" +
            this.pickQueue.length,
        ),
          (D =
            (w = this.callRefTimer) === null || w === void 0
              ? void 0
              : w.unref) === null ||
            D === void 0 ||
            D.call(w));
    }
    removeConnectivityStateWatcher(L) {
      let w = this.connectivityStateWatchers.findIndex((D) => D === L);
      if (w >= 0) this.connectivityStateWatchers.splice(w, 1);
    }
    updateState(L) {
      if (
        ((0, A.trace)(
          h.LogVerbosity.DEBUG,
          "connectivity_state",
          "(" +
            this.channelzRef.id +
            ") " +
            (0, o.uriToString)(this.target) +
            " " +
            n.ConnectivityState[this.connectivityState] +
            " -> " +
            n.ConnectivityState[L],
        ),
        this.channelzEnabled)
      )
        this.channelzInfoTracker.trace.addTrace(
          "CT_INFO",
          "Connectivity state change to " + n.ConnectivityState[L],
        );
      ((this.connectivityState = L), (this.channelzInfoTracker.state = L));
      let w = this.connectivityStateWatchers.slice();
      for (let D of w)
        if (L !== D.currentState) {
          if (D.timer) clearTimeout(D.timer);
          (this.removeConnectivityStateWatcher(D), D.callback());
        }
      if (L !== n.ConnectivityState.TRANSIENT_FAILURE)
        this.currentResolutionError = null;
    }
    throttleKeepalive(L) {
      if (L > this.keepaliveTime) {
        this.keepaliveTime = L;
        for (let w of this.wrappedSubchannels) w.throttleKeepalive(L);
      }
    }
    addWrappedSubchannel(L) {
      this.wrappedSubchannels.add(L);
    }
    removeWrappedSubchannel(L) {
      this.wrappedSubchannels.delete(L);
    }
    doPick(L, w) {
      return this.currentPicker.pick({ metadata: L, extraPickInfo: w });
    }
    queueCallForPick(L) {
      (this.pickQueue.push(L), this.callRefTimerRef());
    }
    getConfig(L, w) {
      if (this.connectivityState !== n.ConnectivityState.SHUTDOWN)
        this.resolvingLoadBalancer.exitIdle();
      if (this.configSelector)
        return {
          type: "SUCCESS",
          config: this.configSelector.invoke(L, w, this.randomChannelId),
        };
      else if (this.currentResolutionError)
        return { type: "ERROR", error: this.currentResolutionError };
      else return { type: "NONE" };
    }
    queueCallForConfig(L) {
      (this.configSelectionQueue.push(L), this.callRefTimerRef());
    }
    enterIdle() {
      if (
        (this.resolvingLoadBalancer.destroy(),
        this.updateState(n.ConnectivityState.IDLE),
        (this.currentPicker = new t.QueuePicker(this.resolvingLoadBalancer)),
        this.idleTimer)
      )
        (clearTimeout(this.idleTimer), (this.idleTimer = null));
      if (this.callRefTimer)
        (clearInterval(this.callRefTimer), (this.callRefTimer = null));
    }
    startIdleTimeout(L) {
      var w, D;
      ((this.idleTimer = setTimeout(() => {
        if (this.callCount > 0) {
          this.startIdleTimeout(this.idleTimeoutMs);
          return;
        }
        let B = new Date().valueOf() - this.lastActivityTimestamp.valueOf();
        if (B >= this.idleTimeoutMs)
          (this.trace(
            "Idle timer triggered after " +
              this.idleTimeoutMs +
              "ms of inactivity",
          ),
            this.enterIdle());
        else this.startIdleTimeout(this.idleTimeoutMs - B);
      }, L)),
        (D = (w = this.idleTimer).unref) === null || D === void 0 || D.call(w));
    }
    maybeStartIdleTimer() {
      if (
        this.connectivityState !== n.ConnectivityState.SHUTDOWN &&
        !this.idleTimer
      )
        this.startIdleTimeout(this.idleTimeoutMs);
    }
    onCallStart() {
      if (this.channelzEnabled)
        this.channelzInfoTracker.callTracker.addCallStarted();
      this.callCount += 1;
    }
    onCallEnd(L) {
      if (this.channelzEnabled)
        if (L.code === h.Status.OK)
          this.channelzInfoTracker.callTracker.addCallSucceeded();
        else this.channelzInfoTracker.callTracker.addCallFailed();
      ((this.callCount -= 1),
        (this.lastActivityTimestamp = new Date()),
        this.maybeStartIdleTimer());
    }
    createLoadBalancingCall(L, w, D, B, M) {
      let V = (0, y.getNextCallNumber)();
      return (
        this.trace("createLoadBalancingCall [" + V + '] method="' + w + '"'),
        new _.LoadBalancingCall(this, L, w, D, B, M, V)
      );
    }
    createRetryingCall(L, w, D, B, M) {
      let V = (0, y.getNextCallNumber)();
      return (
        this.trace("createRetryingCall [" + V + '] method="' + w + '"'),
        new P.RetryingCall(
          this,
          L,
          w,
          D,
          B,
          M,
          V,
          this.retryBufferTracker,
          g.get(this.getTarget()),
        )
      );
    }
    createResolvingCall(L, w, D, B, M) {
      let V = (0, y.getNextCallNumber)();
      this.trace(
        "createResolvingCall [" +
          V +
          '] method="' +
          L +
          '", deadline=' +
          (0, m.deadlineToString)(w),
      );
      let Q = {
          deadline: w,
          flags: M !== null && M !== void 0 ? M : h.Propagate.DEFAULTS,
          host: D !== null && D !== void 0 ? D : this.defaultAuthority,
          parentCall: B,
        },
        W = new b.ResolvingCall(this, L, Q, this.filterStackFactory.clone(), V);
      return (
        this.onCallStart(),
        W.addStatusWatcher((eT) => {
          this.onCallEnd(eT);
        }),
        W
      );
    }
    close() {
      var L;
      (this.resolvingLoadBalancer.destroy(),
        this.updateState(n.ConnectivityState.SHUTDOWN),
        (this.currentPicker = new j()));
      for (let w of this.configSelectionQueue)
        w.cancelWithStatus(
          h.Status.UNAVAILABLE,
          "Channel closed before call started",
        );
      this.configSelectionQueue = [];
      for (let w of this.pickQueue)
        w.cancelWithStatus(
          h.Status.UNAVAILABLE,
          "Channel closed before call started",
        );
      if (((this.pickQueue = []), this.callRefTimer))
        clearInterval(this.callRefTimer);
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (this.channelzEnabled) (0, p.unregisterChannelzRef)(this.channelzRef);
      (this.subchannelPool.unrefUnusedSubchannels(),
        (L = this.configSelector) === null || L === void 0 || L.unref(),
        (this.configSelector = null));
    }
    getTarget() {
      return (0, o.uriToString)(this.target);
    }
    getConnectivityState(L) {
      let w = this.connectivityState;
      if (L)
        (this.resolvingLoadBalancer.exitIdle(),
          (this.lastActivityTimestamp = new Date()),
          this.maybeStartIdleTimer());
      return w;
    }
    watchConnectivityState(L, w, D) {
      if (this.connectivityState === n.ConnectivityState.SHUTDOWN)
        throw Error("Channel has been shut down");
      let B = null;
      if (w !== 1 / 0) {
        let V = w instanceof Date ? w : new Date(w),
          Q = new Date();
        if (w === -1 / 0 || V <= Q) {
          process.nextTick(
            D,
            Error("Deadline passed without connectivity state change"),
          );
          return;
        }
        B = setTimeout(() => {
          (this.removeConnectivityStateWatcher(M),
            D(Error("Deadline passed without connectivity state change")));
        }, V.getTime() - Q.getTime());
      }
      let M = { currentState: L, callback: D, timer: B };
      this.connectivityStateWatchers.push(M);
    }
    getChannelzRef() {
      return this.channelzRef;
    }
    createCall(L, w, D, B, M) {
      if (typeof L !== "string")
        throw TypeError("Channel#createCall: method must be a string");
      if (!(typeof w === "number" || w instanceof Date))
        throw TypeError(
          "Channel#createCall: deadline must be a number or Date",
        );
      if (this.connectivityState === n.ConnectivityState.SHUTDOWN)
        throw Error("Channel has been shut down");
      return this.createResolvingCall(L, w, D, B, M);
    }
    getOptions() {
      return this.options;
    }
  }
  T.InternalChannel = C;
};
