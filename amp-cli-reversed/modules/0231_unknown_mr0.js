async function mr0(T, R, a) {
  let e = await gFT(),
    t = {};
  return {
    onOpen: async (r, h) => {
      if (m8().debug({
        msg: "client websocket connected",
        targetUrl: R
      }), h.readyState !== 1) {
        m8().warn({
          msg: "client websocket not open on connection",
          targetUrl: R,
          readyState: h.readyState
        });
        return;
      }
      let i = new e(R, a);
      t.targetWs = i, t.connectPromise = new Promise((c, s) => {
        i.addEventListener("open", () => {
          if (m8().debug({
            msg: "target websocket connected",
            targetUrl: R
          }), h.readyState !== 1) {
            m8().warn({
              msg: "client websocket closed before target connected",
              targetUrl: R,
              clientReadyState: h.readyState
            }), i.close(1001, "Client disconnected"), s(Error("Client disconnected"));
            return;
          }
          c();
        }), i.addEventListener("error", A => {
          m8().warn({
            msg: "target websocket error during connection",
            targetUrl: R
          }), s(A);
        });
      }), t.targetWs.addEventListener("message", c => {
        if (typeof c.data === "string" || c.data instanceof ArrayBuffer) h.send(c.data);else if (c.data instanceof Blob) c.data.arrayBuffer().then(s => {
          h.send(s);
        });
      }), t.targetWs.addEventListener("close", c => {
        m8().debug({
          msg: "target websocket closed",
          targetUrl: R,
          code: c.code,
          reason: c.reason
        }), $z(h, c.code, c.reason);
      }), t.targetWs.addEventListener("error", c => {
        m8().error({
          msg: "target websocket error",
          targetUrl: R,
          error: _r(c)
        }), $z(h, 1011, "Target WebSocket error");
      });
    },
    onMessage: async (r, h) => {
      if (!t.targetWs || !t.connectPromise) {
        m8().error({
          msg: "websocket state not initialized",
          targetUrl: R
        });
        return;
      }
      try {
        if (await t.connectPromise, t.targetWs.readyState === e.OPEN) t.targetWs.send(r.data);else m8().warn({
          msg: "target websocket not open",
          targetUrl: R,
          readyState: t.targetWs.readyState
        });
      } catch (i) {
        m8().error({
          msg: "failed to connect to target websocket",
          targetUrl: R,
          error: i
        }), $z(h, 1011, "Failed to connect to target");
      }
    },
    onClose: (r, h) => {
      if (m8().debug({
        msg: "client websocket closed",
        targetUrl: R,
        code: r.code,
        reason: r.reason,
        wasClean: r.wasClean
      }), t.targetWs) {
        if (t.targetWs.readyState === e.OPEN || t.targetWs.readyState === e.CONNECTING) t.targetWs.close(1000, r.reason || "Client disconnected");
      }
    },
    onError: (r, h) => {
      if (m8().error({
        msg: "client websocket error",
        targetUrl: R,
        event: r
      }), t.targetWs) {
        if (t.targetWs.readyState === e.OPEN) t.targetWs.close(1011, "Client WebSocket error");else if (t.targetWs.readyState === e.CONNECTING) t.targetWs.close();
      }
    }
  };
}