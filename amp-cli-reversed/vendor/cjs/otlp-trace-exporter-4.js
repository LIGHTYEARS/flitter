// Module: otlp-trace-exporter-4
// Original: KhR
// Type: CJS (RT wrapper)
// Exports: OTLPTraceExporter
// Category: util

// Module: khR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.RoundRobinLoadBalancer = void 0),
    (T.setup = p));
  var R = lx(),
    a = Ic(),
    e = rm(),
    t = j3(),
    r = c8(),
    h = mc(),
    i = WZ(),
    c = "round_robin";
  function s(_) {
    t.trace(r.LogVerbosity.DEBUG, c, _);
  }
  var A = "round_robin";
  class l {
    getLoadBalancerName() {
      return A;
    }
    constructor() {}
    toJsonObject() {
      return { [A]: {} };
    }
    static createFromJson(_) {
      return new l();
    }
  }
  class o {
    constructor(_, m = 0) {
      ((this.children = _), (this.nextIndex = m));
    }
    pick(_) {
      let m = this.children[this.nextIndex].picker;
      return (
        (this.nextIndex = (this.nextIndex + 1) % this.children.length),
        m.pick(_)
      );
    }
    peekNextEndpoint() {
      return this.children[this.nextIndex].endpoint;
    }
  }
  class n {
    constructor(_) {
      ((this.channelControlHelper = _),
        (this.children = []),
        (this.currentState = a.ConnectivityState.IDLE),
        (this.currentReadyPicker = null),
        (this.updatesPaused = !1),
        (this.lastError = null),
        (this.childChannelControlHelper = (0,
        R.createChildChannelControlHelper)(_, {
          updateState: (m, b, y) => {
            if (
              this.currentState === a.ConnectivityState.READY &&
              m !== a.ConnectivityState.READY
            )
              this.channelControlHelper.requestReresolution();
            if (y) this.lastError = y;
            this.calculateAndUpdateState();
          },
        })));
    }
    countChildrenWithState(_) {
      return this.children.filter((m) => m.getConnectivityState() === _).length;
    }
    calculateAndUpdateState() {
      if (this.updatesPaused) return;
      if (this.countChildrenWithState(a.ConnectivityState.READY) > 0) {
        let _ = this.children.filter(
            (b) => b.getConnectivityState() === a.ConnectivityState.READY,
          ),
          m = 0;
        if (this.currentReadyPicker !== null) {
          let b = this.currentReadyPicker.peekNextEndpoint();
          if (
            ((m = _.findIndex((y) => (0, h.endpointEqual)(y.getEndpoint(), b))),
            m < 0)
          )
            m = 0;
        }
        this.updateState(
          a.ConnectivityState.READY,
          new o(
            _.map((b) => ({
              endpoint: b.getEndpoint(),
              picker: b.getPicker(),
            })),
            m,
          ),
          null,
        );
      } else if (
        this.countChildrenWithState(a.ConnectivityState.CONNECTING) > 0
      )
        this.updateState(
          a.ConnectivityState.CONNECTING,
          new e.QueuePicker(this),
          null,
        );
      else if (
        this.countChildrenWithState(a.ConnectivityState.TRANSIENT_FAILURE) > 0
      ) {
        let _ = `round_robin: No connection established. Last error: ${this.lastError}`;
        this.updateState(
          a.ConnectivityState.TRANSIENT_FAILURE,
          new e.UnavailablePicker({ details: _ }),
          _,
        );
      } else
        this.updateState(
          a.ConnectivityState.IDLE,
          new e.QueuePicker(this),
          null,
        );
      for (let _ of this.children)
        if (_.getConnectivityState() === a.ConnectivityState.IDLE) _.exitIdle();
    }
    updateState(_, m, b) {
      if (
        (s(
          a.ConnectivityState[this.currentState] +
            " -> " +
            a.ConnectivityState[_],
        ),
        _ === a.ConnectivityState.READY)
      )
        this.currentReadyPicker = m;
      else this.currentReadyPicker = null;
      ((this.currentState = _), this.channelControlHelper.updateState(_, m, b));
    }
    resetSubchannelList() {
      for (let _ of this.children) _.destroy();
    }
    updateAddressList(_, m, b) {
      (this.resetSubchannelList(),
        s("Connect to endpoint list " + _.map(h.endpointToString)),
        (this.updatesPaused = !0),
        (this.children = _.map(
          (y) => new i.LeafLoadBalancer(y, this.childChannelControlHelper, b),
        )));
      for (let y of this.children) y.startConnecting();
      ((this.updatesPaused = !1), this.calculateAndUpdateState());
    }
    exitIdle() {}
    resetBackoff() {}
    destroy() {
      this.resetSubchannelList();
    }
    getTypeName() {
      return A;
    }
  }
  T.RoundRobinLoadBalancer = n;
  function p() {
    (0, R.registerLoadBalancerType)(A, n, l);
  }
};
