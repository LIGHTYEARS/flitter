// Module: anthropic-message-stream
// Original: pfR
// Type: ESM (PT wrapper)
// Exports: AI, AwT, Gh, Kp, Mu, R5, _I, a, a5, bI, cAT, cC, e, e5, hC, iAT, iC, ko, mI, oC, pI, r, r5, rC, sC, t, t5, uI
// Category: npm-pkg

// Module: pfR (ESM)
() => {
  (Tp(),
    mO(),
    rwT(),
    QN(),
    lwT(),
    (AwT = class T {
      constructor(R, a) {
        (Gh.add(this),
          (this.messages = []),
          (this.receivedMessages = []),
          Jn.set(this, void 0),
          Mu.set(this, null),
          (this.controller = new AbortController()),
          AI.set(this, void 0),
          rC.set(this, () => {}),
          pI.set(this, () => {}),
          _I.set(this, void 0),
          hC.set(this, () => {}),
          bI.set(this, () => {}),
          ko.set(this, {}),
          mI.set(this, !1),
          iC.set(this, !1),
          cC.set(this, !1),
          Kp.set(this, !1),
          sC.set(this, void 0),
          oC.set(this, void 0),
          uI.set(this, void 0),
          a5.set(this, (e) => {
            if (($0(this, iC, !0, "f"), Wj(e))) e = new pi();
            if (e instanceof pi)
              return ($0(this, cC, !0, "f"), this._emit("abort", e));
            if (e instanceof f9) return this._emit("error", e);
            if (e instanceof Error) {
              let t = new f9(e.message);
              return ((t.cause = e), this._emit("error", t));
            }
            return this._emit("error", new f9(String(e)));
          }),
          $0(
            this,
            AI,
            new Promise((e, t) => {
              ($0(this, rC, e, "f"), $0(this, pI, t, "f"));
            }),
            "f",
          ),
          $0(
            this,
            _I,
            new Promise((e, t) => {
              ($0(this, hC, e, "f"), $0(this, bI, t, "f"));
            }),
            "f",
          ),
          mR(this, AI, "f").catch(() => {}),
          mR(this, _I, "f").catch(() => {}),
          $0(this, Mu, R, "f"),
          $0(this, uI, a?.logger ?? console, "f"));
      }
      get response() {
        return mR(this, sC, "f");
      }
      get request_id() {
        return mR(this, oC, "f");
      }
      async withResponse() {
        $0(this, Kp, !0, "f");
        let R = await mR(this, AI, "f");
        if (!R) throw Error("Could not resolve a `Response` object");
        return {
          data: this,
          response: R,
          request_id: R.headers.get("request-id"),
        };
      }
      static fromReadableStream(R) {
        let a = new T(null);
        return (a._run(() => a._fromReadableStream(R)), a);
      }
      static createMessage(R, a, e, { logger: t } = {}) {
        let r = new T(a, { logger: t });
        for (let h of a.messages) r._addMessageParam(h);
        return (
          $0(r, Mu, { ...a, stream: !0 }, "f"),
          r._run(() =>
            r._createMessage(
              R,
              { ...a, stream: !0 },
              {
                ...e,
                headers: {
                  ...e?.headers,
                  "X-Stainless-Helper-Method": "stream",
                },
              },
            ),
          ),
          r
        );
      }
      _run(R) {
        R().then(
          () => {
            (this._emitFinal(), this._emit("end"));
          },
          mR(this, a5, "f"),
        );
      }
      _addMessageParam(R) {
        this.messages.push(R);
      }
      _addMessage(R, a = !0) {
        if ((this.receivedMessages.push(R), a)) this._emit("message", R);
      }
      async _createMessage(R, a, e) {
        let t = e?.signal,
          r;
        if (t) {
          if (t.aborted) this.controller.abort();
          ((r = this.controller.abort.bind(this.controller)),
            t.addEventListener("abort", r));
        }
        try {
          mR(this, Gh, "m", e5).call(this);
          let { response: h, data: i } = await R.create(
            { ...a, stream: !0 },
            { ...e, signal: this.controller.signal },
          ).withResponse();
          this._connected(h);
          for await (let c of i) mR(this, Gh, "m", t5).call(this, c);
          if (i.controller.signal?.aborted) throw new pi();
          mR(this, Gh, "m", r5).call(this);
        } finally {
          if (t && r) t.removeEventListener("abort", r);
        }
      }
      _connected(R) {
        if (this.ended) return;
        ($0(this, sC, R, "f"),
          $0(this, oC, R?.headers.get("request-id"), "f"),
          mR(this, rC, "f").call(this, R),
          this._emit("connect"));
      }
      get ended() {
        return mR(this, mI, "f");
      }
      get errored() {
        return mR(this, iC, "f");
      }
      get aborted() {
        return mR(this, cC, "f");
      }
      abort() {
        this.controller.abort();
      }
      on(R, a) {
        return (
          (mR(this, ko, "f")[R] || (mR(this, ko, "f")[R] = [])).push({
            listener: a,
          }),
          this
        );
      }
      off(R, a) {
        let e = mR(this, ko, "f")[R];
        if (!e) return this;
        let t = e.findIndex((r) => r.listener === a);
        if (t >= 0) e.splice(t, 1);
        return this;
      }
      once(R, a) {
        return (
          (mR(this, ko, "f")[R] || (mR(this, ko, "f")[R] = [])).push({
            listener: a,
            once: !0,
          }),
          this
        );
      }
      emitted(R) {
        return new Promise((a, e) => {
          if (($0(this, Kp, !0, "f"), R !== "error")) this.once("error", e);
          this.once(R, a);
        });
      }
      async done() {
        ($0(this, Kp, !0, "f"), await mR(this, _I, "f"));
      }
      get currentMessage() {
        return mR(this, Jn, "f");
      }
      async finalMessage() {
        return (await this.done(), mR(this, Gh, "m", R5).call(this));
      }
      async finalText() {
        return (await this.done(), mR(this, Gh, "m", iAT).call(this));
      }
      _emit(R, ...a) {
        if (mR(this, mI, "f")) return;
        if (R === "end") ($0(this, mI, !0, "f"), mR(this, hC, "f").call(this));
        let e = mR(this, ko, "f")[R];
        if (e)
          ((mR(this, ko, "f")[R] = e.filter((t) => !t.once)),
            e.forEach(({ listener: t }) => t(...a)));
        if (R === "abort") {
          let t = a[0];
          if (!mR(this, Kp, "f") && !e?.length) Promise.reject(t);
          (mR(this, pI, "f").call(this, t),
            mR(this, bI, "f").call(this, t),
            this._emit("end"));
          return;
        }
        if (R === "error") {
          let t = a[0];
          if (!mR(this, Kp, "f") && !e?.length) Promise.reject(t);
          (mR(this, pI, "f").call(this, t),
            mR(this, bI, "f").call(this, t),
            this._emit("end"));
        }
      }
      _emitFinal() {
        if (this.receivedMessages.at(-1))
          this._emit("finalMessage", mR(this, Gh, "m", R5).call(this));
      }
      async _fromReadableStream(R, a) {
        let e = a?.signal,
          t;
        if (e) {
          if (e.aborted) this.controller.abort();
          ((t = this.controller.abort.bind(this.controller)),
            e.addEventListener("abort", t));
        }
        try {
          (mR(this, Gh, "m", e5).call(this), this._connected(null));
          let r = kk.fromReadableStream(R, this.controller);
          for await (let h of r) mR(this, Gh, "m", t5).call(this, h);
          if (r.controller.signal?.aborted) throw new pi();
          mR(this, Gh, "m", r5).call(this);
        } finally {
          if (e && t) e.removeEventListener("abort", t);
        }
      }
      [((Jn = new WeakMap()),
      (Mu = new WeakMap()),
      (AI = new WeakMap()),
      (rC = new WeakMap()),
      (pI = new WeakMap()),
      (_I = new WeakMap()),
      (hC = new WeakMap()),
      (bI = new WeakMap()),
      (ko = new WeakMap()),
      (mI = new WeakMap()),
      (iC = new WeakMap()),
      (cC = new WeakMap()),
      (Kp = new WeakMap()),
      (sC = new WeakMap()),
      (oC = new WeakMap()),
      (uI = new WeakMap()),
      (a5 = new WeakMap()),
      (Gh = new WeakSet()),
      (R5 = function () {
        if (this.receivedMessages.length === 0)
          throw new f9(
            "stream ended without producing a Message with role=assistant",
          );
        return this.receivedMessages.at(-1);
      }),
      (iAT = function () {
        if (this.receivedMessages.length === 0)
          throw new f9(
            "stream ended without producing a Message with role=assistant",
          );
        let R = this.receivedMessages
          .at(-1)
          .content.filter((a) => a.type === "text")
          .map((a) => a.text);
        if (R.length === 0)
          throw new f9(
            "stream ended without producing a content block with type=text",
          );
        return R.join(" ");
      }),
      (e5 = function () {
        if (this.ended) return;
        $0(this, Jn, void 0, "f");
      }),
      (t5 = function (R) {
        if (this.ended) return;
        let a = mR(this, Gh, "m", cAT).call(this, R);
        switch ((this._emit("streamEvent", R, a), R.type)) {
          case "content_block_delta": {
            let e = a.content.at(-1);
            switch (R.delta.type) {
              case "text_delta": {
                if (e.type === "text")
                  this._emit("text", R.delta.text, e.text || "");
                break;
              }
              case "citations_delta": {
                if (e.type === "text")
                  this._emit("citation", R.delta.citation, e.citations ?? []);
                break;
              }
              case "input_json_delta": {
                if (rAT(e) && e.input)
                  this._emit("inputJson", R.delta.partial_json, e.input);
                break;
              }
              case "thinking_delta": {
                if (e.type === "thinking")
                  this._emit("thinking", R.delta.thinking, e.thinking);
                break;
              }
              case "signature_delta": {
                if (e.type === "thinking") this._emit("signature", e.signature);
                break;
              }
              default:
                hAT(R.delta);
            }
            break;
          }
          case "message_stop": {
            (this._addMessageParam(a),
              this._addMessage(
                tAT(a, mR(this, Mu, "f"), { logger: mR(this, uI, "f") }),
                !0,
              ));
            break;
          }
          case "content_block_stop": {
            this._emit("contentBlock", a.content.at(-1));
            break;
          }
          case "message_start": {
            $0(this, Jn, a, "f");
            break;
          }
          case "content_block_start":
          case "message_delta":
            break;
        }
      }),
      (r5 = function () {
        if (this.ended) throw new f9("stream has ended, this shouldn't happen");
        let R = mR(this, Jn, "f");
        if (!R) throw new f9("request ended without sending any chunks");
        return (
          $0(this, Jn, void 0, "f"),
          tAT(R, mR(this, Mu, "f"), { logger: mR(this, uI, "f") })
        );
      }),
      (cAT = function (R) {
        let a = mR(this, Jn, "f");
        if (R.type === "message_start") {
          if (a)
            throw new f9(
              `Unexpected event order, got ${R.type} before receiving "message_stop"`,
            );
          return R.message;
        }
        if (!a)
          throw new f9(
            `Unexpected event order, got ${R.type} before "message_start"`,
          );
        switch (R.type) {
          case "message_stop":
            return a;
          case "message_delta":
            if (
              ((a.stop_reason = R.delta.stop_reason),
              (a.stop_sequence = R.delta.stop_sequence),
              (a.usage.output_tokens = R.usage.output_tokens),
              R.usage.input_tokens != null)
            )
              a.usage.input_tokens = R.usage.input_tokens;
            if (R.usage.cache_creation_input_tokens != null)
              a.usage.cache_creation_input_tokens =
                R.usage.cache_creation_input_tokens;
            if (R.usage.cache_read_input_tokens != null)
              a.usage.cache_read_input_tokens = R.usage.cache_read_input_tokens;
            if (R.usage.server_tool_use != null)
              a.usage.server_tool_use = R.usage.server_tool_use;
            return a;
          case "content_block_start":
            return (a.content.push({ ...R.content_block }), a);
          case "content_block_delta": {
            let e = a.content.at(R.index);
            switch (R.delta.type) {
              case "text_delta": {
                if (e?.type === "text")
                  a.content[R.index] = {
                    ...e,
                    text: (e.text || "") + R.delta.text,
                  };
                break;
              }
              case "citations_delta": {
                if (e?.type === "text")
                  a.content[R.index] = {
                    ...e,
                    citations: [...(e.citations ?? []), R.delta.citation],
                  };
                break;
              }
              case "input_json_delta": {
                if (e && rAT(e)) {
                  let t = e[sAT] || "";
                  t += R.delta.partial_json;
                  let r = { ...e };
                  if (
                    (Object.defineProperty(r, sAT, {
                      value: t,
                      enumerable: !1,
                      writable: !0,
                    }),
                    t)
                  )
                    r.input = YN(t);
                  a.content[R.index] = r;
                }
                break;
              }
              case "thinking_delta": {
                if (e?.type === "thinking")
                  a.content[R.index] = {
                    ...e,
                    thinking: e.thinking + R.delta.thinking,
                  };
                break;
              }
              case "signature_delta": {
                if (e?.type === "thinking")
                  a.content[R.index] = { ...e, signature: R.delta.signature };
                break;
              }
              default:
                hAT(R.delta);
            }
            return a;
          }
          case "content_block_stop":
            return a;
        }
      }),
      Symbol.asyncIterator)]() {
        let R = [],
          a = [],
          e = !1;
        return (
          this.on("streamEvent", (t) => {
            let r = a.shift();
            if (r) r.resolve(t);
            else R.push(t);
          }),
          this.on("end", () => {
            e = !0;
            for (let t of a) t.resolve(void 0);
            a.length = 0;
          }),
          this.on("abort", (t) => {
            e = !0;
            for (let r of a) r.reject(t);
            a.length = 0;
          }),
          this.on("error", (t) => {
            e = !0;
            for (let r of a) r.reject(t);
            a.length = 0;
          }),
          {
            next: async () => {
              if (!R.length) {
                if (e) return { value: void 0, done: !0 };
                return new Promise((t, r) =>
                  a.push({ resolve: t, reject: r }),
                ).then((t) =>
                  t ? { value: t, done: !1 } : { value: void 0, done: !0 },
                );
              }
              return { value: R.shift(), done: !1 };
            },
            return: async () => {
              return (this.abort(), { value: void 0, done: !0 });
            },
          }
        );
      }
      toReadableStream() {
        return new kk(
          this[Symbol.asyncIterator].bind(this),
          this.controller,
        ).toReadableStream();
      }
    }));
};
