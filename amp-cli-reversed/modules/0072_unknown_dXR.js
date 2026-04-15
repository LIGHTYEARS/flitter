function cFT(T) {
  let R = $mR(T),
    a = dXR(R, T);
  return {
    toolService: R,
    dispose: () => {
      a.dispose(), R.dispose();
    }
  };
}
function dXR(T, R) {
  let a = [],
    e,
    t,
    r,
    h,
    i,
    c,
    s;
  a.push(T.registerTool(ZVR)), a.push(T.registerTool(NVR)), a.push(T.registerTool(WX)), a.push(T.registerTool(eFR)), a.push(T.registerTool(TXR)), a.push(T.registerTool(GVR)), a.push(T.registerTool(iGR)), a.push(T.registerTool(wzT)), a.push(T.registerTool(gVR)), a.push(T.registerTool(rFR)), a.push(T.registerTool(mK)), a.push(T.registerTool(F2R)), a.push(T.registerTool(bXR)), a.push(T.registerTool(OXR)), a.push(T.registerTool(pXR)), a.push(T.registerTool(DVR)), a.push(T.registerTool(DWT)), a.push(T.registerTool(IKR)), a.push(T.registerTool(kVR)), a.push(T.registerTool(TzR)), a.push(T.registerTool(nKR)), a.push(T.registerTool(_KR)), a.push(T.registerTool(YGR)), a.push(T.registerTool(JGR)), a.push(T.registerTool(rKR)), a.push(T.registerTool(cKR)), a.push(T.registerTool(aKR)), a.push(T.registerTool(EGR)), a.push(T.registerTool(gGR)), a.push(T.registerTool(SGR)), a.push(T.registerTool(xGR)), a.push(T.registerTool(MGR)), a.push(T.registerTool(bGR)), a.push(T.registerTool(nGR)), a.push(T.registerTool(OzT)), a.push(T.registerTool(I2R)), a.push(T.registerTool(kXR)), a.push(T.registerTool($XR));
  let A = R.configService.config.pipe(JR(({
    settings: l
  }) => ({
    "experimental.autoSnapshot": l["experimental.autoSnapshot"],
    "experimental.tools": l["experimental.tools"],
    "experimental.cerebrasFinder": l["experimental.cerebrasFinder"]
  })), E9((l, o) => l["experimental.autoSnapshot"] === o["experimental.autoSnapshot"] && l["experimental.cerebrasFinder"] === o["experimental.cerebrasFinder"] && JSON.stringify(l["experimental.tools"]) === JSON.stringify(o["experimental.tools"]))).subscribe(l => {
    if (e?.dispose(), e = T.registerTool(OWT), l["experimental.autoSnapshot"]) {
      if (i?.dispose(), i = void 0, !c) c = T.registerTool(J2R);
    } else if (c?.dispose(), c = void 0, !i) i = T.registerTool(tGR);
    if (t?.dispose(), l["experimental.cerebrasFinder"]) t = T.registerTool(W2R);else t = T.registerTool(qzT);
    Promise.resolve().then(() => (vBR(), TqT)).then(({
      painterToolReg: n
    }) => {
      if (!r) r = T.registerTool(n);
    });
    let o = l["experimental.tools"] ?? [];
    if (J.debug("repl tool registration check", {
      experimentalTools: o
    }), Promise.resolve().then(() => (WBR(), hqT)).then(({
      replToolReg: n
    }) => {
      let p = n.spec.name,
        _ = o.includes(p),
        m = n.fn !== null;
      if (J.debug("repl tool dynamic import resolved", {
        toolName: p,
        isEnabled: _,
        hasFn: m,
        hasExistingDisposable: !!h
      }), _) {
        if (!h) J.debug("registering repl tool", {
          toolName: p,
          hasFn: m
        }), h = T.registerTool(n), J.debug("repl tool registered", {
          toolName: p,
          disposableIsNoop: h === void 0
        });
      } else {
        if (h) J.debug("unregistering repl tool", {
          toolName: p
        });
        h?.dispose(), h = void 0;
      }
    }), !s) Promise.resolve().then(() => (FBR(), cqT)).then(({
      handoffToolReg: n
    }) => {
      s = T.registerTool(n);
    });
  });
  return {
    dispose() {
      A.unsubscribe(), e?.dispose(), t?.dispose(), r?.dispose(), s?.dispose(), c?.dispose(), i?.dispose(), h?.dispose();
      for (let l of a) l.dispose();
    }
  };
}