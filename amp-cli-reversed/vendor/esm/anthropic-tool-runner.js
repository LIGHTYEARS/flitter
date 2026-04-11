// Module: anthropic-tool-runner
// Original: QlT
// Type: ESM (PT wrapper)
// Exports: Da, Gp, Jq, Po, YlT, Yr, Zn, a, h, iK, lI, nI, oI, r
// Category: npm-pkg

// Module: QlT (ESM)
() => {
  (Tp(),
    hK(),
    Ii(),
    Mi(),
    XN(),
    (iK = class {
      constructor(R, a, e) {
        (oI.add(this),
          (this.client = R),
          Lu.set(this, !1),
          Gp.set(this, !1),
          Da.set(this, void 0),
          nI.set(this, void 0),
          Yr.set(this, void 0),
          Po.set(this, void 0),
          Zn.set(this, void 0),
          lI.set(this, 0),
          $0(
            this,
            Da,
            { params: { ...a, messages: structuredClone(a.messages) } },
            "f",
          ));
        let t = ["BetaToolRunner", ...Z7T(a.tools, a.messages)].join(", ");
        ($0(
          this,
          nI,
          { ...e, headers: i8([{ "x-stainless-helper": t }, e?.headers]) },
          "f",
        ),
          $0(this, Zn, XlT(), "f"));
      }
      async *[((Lu = new WeakMap()),
      (Gp = new WeakMap()),
      (Da = new WeakMap()),
      (nI = new WeakMap()),
      (Yr = new WeakMap()),
      (Po = new WeakMap()),
      (Zn = new WeakMap()),
      (lI = new WeakMap()),
      (oI = new WeakSet()),
      (YlT = async function () {
        let R = mR(this, Da, "f").params.compactionControl;
        if (!R || !R.enabled) return !1;
        let a = 0;
        if (mR(this, Yr, "f") !== void 0)
          try {
            let c = await mR(this, Yr, "f");
            a =
              c.usage.input_tokens +
              (c.usage.cache_creation_input_tokens ?? 0) +
              (c.usage.cache_read_input_tokens ?? 0) +
              c.usage.output_tokens;
          } catch {
            return !1;
          }
        let e = R.contextTokenThreshold ?? ofR;
        if (a < e) return !1;
        let t = R.model ?? mR(this, Da, "f").params.model,
          r = R.summaryPrompt ?? nfR,
          h = mR(this, Da, "f").params.messages;
        if (h[h.length - 1].role === "assistant") {
          let c = h[h.length - 1];
          if (Array.isArray(c.content)) {
            let s = c.content.filter((A) => A.type !== "tool_use");
            if (s.length === 0) h.pop();
            else c.content = s;
          }
        }
        let i = await this.client.beta.messages.create(
          {
            model: t,
            messages: [
              ...h,
              { role: "user", content: [{ type: "text", text: r }] },
            ],
            max_tokens: mR(this, Da, "f").params.max_tokens,
          },
          { headers: { "x-stainless-helper": "compaction" } },
        );
        if (i.content[0]?.type !== "text")
          throw new f9("Expected text response for compaction");
        return (
          (mR(this, Da, "f").params.messages = [
            { role: "user", content: i.content },
          ]),
          !0
        );
      }),
      Symbol.asyncIterator)]() {
        var R;
        if (mR(this, Lu, "f"))
          throw new f9("Cannot iterate over a consumed stream");
        ($0(this, Lu, !0, "f"),
          $0(this, Gp, !0, "f"),
          $0(this, Po, void 0, "f"));
        try {
          while (!0) {
            let a;
            try {
              if (
                mR(this, Da, "f").params.max_iterations &&
                mR(this, lI, "f") >= mR(this, Da, "f").params.max_iterations
              )
                break;
              ($0(this, Gp, !1, "f"),
                $0(this, Po, void 0, "f"),
                $0(this, lI, ((R = mR(this, lI, "f")), R++, R), "f"),
                $0(this, Yr, void 0, "f"));
              let {
                max_iterations: e,
                compactionControl: t,
                ...r
              } = mR(this, Da, "f").params;
              if (r.stream)
                ((a = this.client.beta.messages.stream(
                  { ...r },
                  mR(this, nI, "f"),
                )),
                  $0(this, Yr, a.finalMessage(), "f"),
                  mR(this, Yr, "f").catch(() => {}),
                  yield a);
              else
                ($0(
                  this,
                  Yr,
                  this.client.beta.messages.create(
                    { ...r, stream: !1 },
                    mR(this, nI, "f"),
                  ),
                  "f",
                ),
                  yield mR(this, Yr, "f"));
              if (!(await mR(this, oI, "m", YlT).call(this))) {
                if (!mR(this, Gp, "f")) {
                  let { role: i, content: c } = await mR(this, Yr, "f");
                  mR(this, Da, "f").params.messages.push({
                    role: i,
                    content: c,
                  });
                }
                let h = await mR(this, oI, "m", Jq).call(
                  this,
                  mR(this, Da, "f").params.messages.at(-1),
                );
                if (h) mR(this, Da, "f").params.messages.push(h);
                else if (!mR(this, Gp, "f")) break;
              }
            } finally {
              if (a) a.abort();
            }
          }
          if (!mR(this, Yr, "f"))
            throw new f9(
              "ToolRunner concluded without a message from the server",
            );
          mR(this, Zn, "f").resolve(await mR(this, Yr, "f"));
        } catch (a) {
          throw (
            $0(this, Lu, !1, "f"),
            mR(this, Zn, "f").promise.catch(() => {}),
            mR(this, Zn, "f").reject(a),
            $0(this, Zn, XlT(), "f"),
            a
          );
        }
      }
      setMessagesParams(R) {
        if (typeof R === "function")
          mR(this, Da, "f").params = R(mR(this, Da, "f").params);
        else mR(this, Da, "f").params = R;
        ($0(this, Gp, !0, "f"), $0(this, Po, void 0, "f"));
      }
      async generateToolResponse() {
        let R = (await mR(this, Yr, "f")) ?? this.params.messages.at(-1);
        if (!R) return null;
        return mR(this, oI, "m", Jq).call(this, R);
      }
      done() {
        return mR(this, Zn, "f").promise;
      }
      async runUntilDone() {
        if (!mR(this, Lu, "f")) for await (let R of this);
        return this.done();
      }
      get params() {
        return mR(this, Da, "f").params;
      }
      pushMessages(...R) {
        this.setMessagesParams((a) => ({
          ...a,
          messages: [...a.messages, ...R],
        }));
      }
      then(R, a) {
        return this.runUntilDone().then(R, a);
      }
    }),
    (Jq = async function (T) {
      if (mR(this, Po, "f") !== void 0) return mR(this, Po, "f");
      return (
        $0(this, Po, lfR(mR(this, Da, "f").params, T), "f"),
        mR(this, Po, "f")
      );
    }));
};
