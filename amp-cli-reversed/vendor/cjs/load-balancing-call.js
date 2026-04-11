// Module: load-balancing-call
// Original: lhR
// Type: CJS (RT wrapper)
// Exports: LoadBalancingCall
// Category: util

// Module: lhR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.LoadBalancingCall = void 0));
  var R = Ic(),
    a = c8(),
    e = qB(),
    t = Yt(),
    r = rm(),
    h = dh(),
    i = j3(),
    c = NZ(),
    s = qT("http2"),
    A = "load_balancing_call";
  class l {
    constructor(o, n, p, _, m, b, y) {
      var u, P;
      ((this.channel = o),
        (this.callConfig = n),
        (this.methodName = p),
        (this.host = _),
        (this.credentials = m),
        (this.deadline = b),
        (this.callNumber = y),
        (this.child = null),
        (this.readPending = !1),
        (this.pendingMessage = null),
        (this.pendingHalfClose = !1),
        (this.ended = !1),
        (this.metadata = null),
        (this.listener = null),
        (this.onCallEnded = null),
        (this.childStartTime = null));
      let k = this.methodName.split("/"),
        x = "";
      if (k.length >= 2) x = k[1];
      let f =
        (P =
          (u = (0, h.splitHostPort)(this.host)) === null || u === void 0
            ? void 0
            : u.host) !== null && P !== void 0
          ? P
          : "localhost";
      ((this.serviceUrl = `https://${f}/${x}`), (this.startTime = new Date()));
    }
    getDeadlineInfo() {
      var o, n;
      let p = [];
      if (this.childStartTime) {
        if (this.childStartTime > this.startTime) {
          if (
            (o = this.metadata) === null || o === void 0
              ? void 0
              : o.getOptions().waitForReady
          )
            p.push("wait_for_ready");
          p.push(
            `LB pick: ${(0, e.formatDateDifference)(this.startTime, this.childStartTime)}`,
          );
        }
        return (p.push(...this.child.getDeadlineInfo()), p);
      } else {
        if (
          (n = this.metadata) === null || n === void 0
            ? void 0
            : n.getOptions().waitForReady
        )
          p.push("wait_for_ready");
        p.push("Waiting for LB pick");
      }
      return p;
    }
    trace(o) {
      i.trace(a.LogVerbosity.DEBUG, A, "[" + this.callNumber + "] " + o);
    }
    outputStatus(o, n) {
      var p, _;
      if (!this.ended) {
        ((this.ended = !0),
          this.trace(
            "ended with status: code=" +
              o.code +
              ' details="' +
              o.details +
              '" start time=' +
              this.startTime.toISOString(),
          ));
        let m = Object.assign(Object.assign({}, o), { progress: n });
        ((p = this.listener) === null || p === void 0 || p.onReceiveStatus(m),
          (_ = this.onCallEnded) === null ||
            _ === void 0 ||
            _.call(this, m.code));
      }
    }
    doPick() {
      var o, n;
      if (this.ended) return;
      if (!this.metadata) throw Error("doPick called before start");
      this.trace("Pick called");
      let p = this.metadata.clone(),
        _ = this.channel.doPick(p, this.callConfig.pickInformation),
        m = _.subchannel
          ? "(" +
            _.subchannel.getChannelzRef().id +
            ") " +
            _.subchannel.getAddress()
          : "" + _.subchannel;
      switch (
        (this.trace(
          "Pick result: " +
            r.PickResultType[_.pickResultType] +
            " subchannel: " +
            m +
            " status: " +
            ((o = _.status) === null || o === void 0 ? void 0 : o.code) +
            " " +
            ((n = _.status) === null || n === void 0 ? void 0 : n.details),
        ),
        _.pickResultType)
      ) {
        case r.PickResultType.COMPLETE:
          this.credentials
            .compose(_.subchannel.getCallCredentials())
            .generateMetadata({
              method_name: this.methodName,
              service_url: this.serviceUrl,
            })
            .then(
              (u) => {
                var P;
                if (this.ended) {
                  this.trace(
                    "Credentials metadata generation finished after call ended",
                  );
                  return;
                }
                if ((p.merge(u), p.get("authorization").length > 1))
                  this.outputStatus(
                    {
                      code: a.Status.INTERNAL,
                      details:
                        '"authorization" metadata cannot have multiple values',
                      metadata: new t.Metadata(),
                    },
                    "PROCESSED",
                  );
                if (
                  _.subchannel.getConnectivityState() !==
                  R.ConnectivityState.READY
                ) {
                  (this.trace(
                    "Picked subchannel " +
                      m +
                      " has state " +
                      R.ConnectivityState[_.subchannel.getConnectivityState()] +
                      " after getting credentials metadata. Retrying pick",
                  ),
                    this.doPick());
                  return;
                }
                if (this.deadline !== 1 / 0)
                  p.set(
                    "grpc-timeout",
                    (0, e.getDeadlineTimeoutString)(this.deadline),
                  );
                try {
                  ((this.child = _.subchannel
                    .getRealSubchannel()
                    .createCall(p, this.host, this.methodName, {
                      onReceiveMetadata: (k) => {
                        (this.trace("Received metadata"),
                          this.listener.onReceiveMetadata(k));
                      },
                      onReceiveMessage: (k) => {
                        (this.trace("Received message"),
                          this.listener.onReceiveMessage(k));
                      },
                      onReceiveStatus: (k) => {
                        if (
                          (this.trace("Received status"),
                          k.rstCode === s.constants.NGHTTP2_REFUSED_STREAM)
                        )
                          this.outputStatus(k, "REFUSED");
                        else this.outputStatus(k, "PROCESSED");
                      },
                    })),
                    (this.childStartTime = new Date()));
                } catch (k) {
                  (this.trace(
                    "Failed to start call on picked subchannel " +
                      m +
                      " with error " +
                      k.message,
                  ),
                    this.outputStatus(
                      {
                        code: a.Status.INTERNAL,
                        details:
                          "Failed to start HTTP/2 stream with error " +
                          k.message,
                        metadata: new t.Metadata(),
                      },
                      "NOT_STARTED",
                    ));
                  return;
                }
                if (
                  ((P = _.onCallStarted) === null || P === void 0 || P.call(_),
                  (this.onCallEnded = _.onCallEnded),
                  this.trace(
                    "Created child call [" + this.child.getCallNumber() + "]",
                  ),
                  this.readPending)
                )
                  this.child.startRead();
                if (this.pendingMessage)
                  this.child.sendMessageWithContext(
                    this.pendingMessage.context,
                    this.pendingMessage.message,
                  );
                if (this.pendingHalfClose) this.child.halfClose();
              },
              (u) => {
                let { code: P, details: k } = (0,
                c.restrictControlPlaneStatusCode)(
                  typeof u.code === "number" ? u.code : a.Status.UNKNOWN,
                  `Getting metadata from plugin failed with error: ${u.message}`,
                );
                this.outputStatus(
                  { code: P, details: k, metadata: new t.Metadata() },
                  "PROCESSED",
                );
              },
            );
          break;
        case r.PickResultType.DROP:
          let { code: b, details: y } = (0, c.restrictControlPlaneStatusCode)(
            _.status.code,
            _.status.details,
          );
          setImmediate(() => {
            this.outputStatus(
              { code: b, details: y, metadata: _.status.metadata },
              "DROP",
            );
          });
          break;
        case r.PickResultType.TRANSIENT_FAILURE:
          if (this.metadata.getOptions().waitForReady)
            this.channel.queueCallForPick(this);
          else {
            let { code: u, details: P } = (0, c.restrictControlPlaneStatusCode)(
              _.status.code,
              _.status.details,
            );
            setImmediate(() => {
              this.outputStatus(
                { code: u, details: P, metadata: _.status.metadata },
                "PROCESSED",
              );
            });
          }
          break;
        case r.PickResultType.QUEUE:
          this.channel.queueCallForPick(this);
      }
    }
    cancelWithStatus(o, n) {
      var p;
      (this.trace("cancelWithStatus code: " + o + ' details: "' + n + '"'),
        (p = this.child) === null || p === void 0 || p.cancelWithStatus(o, n),
        this.outputStatus(
          { code: o, details: n, metadata: new t.Metadata() },
          "PROCESSED",
        ));
    }
    getPeer() {
      var o, n;
      return (n =
        (o = this.child) === null || o === void 0 ? void 0 : o.getPeer()) !==
        null && n !== void 0
        ? n
        : this.channel.getTarget();
    }
    start(o, n) {
      (this.trace("start called"),
        (this.listener = n),
        (this.metadata = o),
        this.doPick());
    }
    sendMessageWithContext(o, n) {
      if (
        (this.trace("write() called with message of length " + n.length),
        this.child)
      )
        this.child.sendMessageWithContext(o, n);
      else this.pendingMessage = { context: o, message: n };
    }
    startRead() {
      if ((this.trace("startRead called"), this.child)) this.child.startRead();
      else this.readPending = !0;
    }
    halfClose() {
      if ((this.trace("halfClose called"), this.child)) this.child.halfClose();
      else this.pendingHalfClose = !0;
    }
    setCredentials(o) {
      throw Error("Method not implemented.");
    }
    getCallNumber() {
      return this.callNumber;
    }
  }
  T.LoadBalancingCall = l;
};
