function yx0(T, R) {
  let a = [],
    e = [],
    t,
    r = !1,
    h,
    i = R.mode === "aggman",
    c = (n, p, _, m) => {
      if (e.push(n), m !== void 0 && t === void 0) t = m;
      if (_ !== void 0 && h === void 0) h = _;
      if (p === "in-progress" || p === "queued") r = !0;
    },
    s = (n, p) => {
      a.push({
        type: "tool",
        tool: n,
        timestampLookupID: p
      });
    },
    A = (n, p) => {
      a.push({
        type: "activity-group",
        ...n,
        timestampLookupID: p
      });
    },
    l = () => {
      if (e.length === 0) return;
      A({
        rowID: t,
        actions: e,
        summary: cfT(e),
        hasInProgress: r,
        displayMode: i ? "aggman" : "default"
      }, h), e = [], t = void 0, r = !1, h = void 0;
    };
  for (let n of T) {
    if (n.type === "message") {
      if (n.message.content.length > 0 || n.message.images.length > 0) {
        l();
        let {
            message: p
          } = n,
          _ = {
            type: "message",
            text: p.content.map(m => (m.text ?? "").trim()).join(`

`),
            images: p.images,
            timestampLookupID: n.timestampLookupID,
            role: p.role
          };
        if (p.role === "user") _.fromAggman = p.fromAggman, _.fromExecutorThreadID = p.fromExecutorThreadID;
        a.push(_);
      }
      continue;
    }
    if (n.type === "manualBashInvocation") {
      l();
      let p = n.manualBashInvocation.toolRun;
      s({
        kind: "bash",
        rowID: n.rowID,
        command: n.manualBashInvocation.args.cmd,
        status: p.status,
        output: IF(p),
        exitCode: rfT(p),
        error: aa(p)
      });
      continue;
    }
    if (n.type === "toolResult" && n.toolResult) {
      let p = n.toolUse.normalizedName ?? n.toolUse.name,
        _ = n.toolUse.normalizedInput ?? n.toolUse.input,
        m = n.toolResult.run,
        b = n.timestampLookupID,
        y = afT(n.toolUse.id),
        u = (P, k) => {
          s({
            ...P,
            rowID: afT(n.toolUse.id, k?.index)
          }, k?.timestampLookupID ?? b);
        };
      if (bx0(p)) continue;
      if (i) {
        let P = gx0(p, _);
        if (P) {
          c(P, m.status, b, y);
          continue;
        }
      }
      if (p === "Bash" || p === "shell_command") {
        let P = M1T(_);
        if (P) {
          let k = WO(P);
          if (k.isWriteLike && (k.program === "sed" || k.program === "perl")) {
            if (!W4(m.status)) continue;
            l(), u({
              kind: "edit",
              path: k.path ?? P,
              status: m.status,
              linesAdded: 0,
              linesDeleted: 0,
              error: aa(m)
            });
            continue;
          }
          if (k.kind !== "command") {
            let x = B1T(k);
            if (x) {
              c({
                kind: k.kind,
                title: x,
                detail: IF(m)
              }, m.status, b, y);
              continue;
            }
          }
          l(), u({
            kind: "bash",
            command: P,
            status: m.status,
            output: IF(m),
            exitCode: rfT(m),
            error: aa(m)
          });
          continue;
        }
      }
      if (p === "edit_file") {
        if (!W4(m.status)) continue;
        l();
        let P = m.status === "done" && typeof m.result === "object" && m.result && "diff" in m.result ? m.result.diff : void 0,
          k = m.status === "done" ? kx(_.old_str, _.new_str) : {
            added: 0,
            deleted: 0,
            changed: 0
          };
        u({
          kind: "edit",
          path: typeof _.path === "string" ? _.path : "(unknown)",
          status: m.status,
          diff: P,
          linesAdded: k.added,
          linesDeleted: k.deleted,
          error: aa(m)
        });
        continue;
      }
      if (p === "create_file") {
        l();
        let P = typeof _.content === "string" ? _.content : void 0,
          k = xx(P);
        u({
          kind: "create-file",
          path: typeof _.path === "string" ? _.path : "(unknown)",
          status: m.status,
          content: P,
          linesAdded: k.added,
          error: aa(m)
        });
        continue;
      }
      if (p === "apply_patch") {
        if (!W4(m.status)) continue;
        l();
        let P = kx0(m);
        if (P && P.length > 0) for (let [k, x] of P.entries()) u({
          kind: "edit",
          path: x.path,
          status: m.status,
          diff: x.diff || void 0,
          linesAdded: x.additions,
          linesDeleted: x.deletions,
          error: aa(m)
        }, {
          index: k
        });else {
          let k = fx0(_),
            x = k ? Ix0(k) : [];
          for (let [f, v] of (x.length > 0 ? x : ["(unknown)"]).entries()) u({
            kind: "edit",
            path: v,
            status: m.status,
            linesAdded: 0,
            linesDeleted: 0,
            error: aa(m)
          }, {
            index: f
          });
        }
        continue;
      }
      if (p === "Read") {
        let P = ms(p, _);
        c({
          kind: "read",
          title: P
        }, m.status, b, y);
        continue;
      }
      if (p === "file_tree") {
        let P = ms(p, _);
        c({
          kind: "list",
          title: P
        }, m.status, b, y);
        continue;
      }
      if (p === "glob" || p === "Grep") {
        let P = ms(p, _);
        c({
          kind: "search",
          title: P
        }, m.status, b, y);
        continue;
      }
      if (p === "finder") {
        l();
        let P = typeof _.query === "string" ? _.query.trim() : void 0,
          k = Ux0(m, P);
        A({
          rowID: y,
          actions: k,
          summary: cfT(k, P ?? "codebase"),
          hasInProgress: gF(m.status),
          displayMode: i ? "aggman" : "default"
        }, b);
        continue;
      }
      if (p === "web_search") {
        l();
        let P = w1T(_);
        u({
          kind: "generic",
          name: "Web Search",
          detail: P,
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "read_web_page") {
        l();
        let P = D1T(_);
        u({
          kind: "read-web-page",
          url: P,
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "read_thread") {
        let P = typeof _.threadID === "string" ? _.threadID.trim() : void 0,
          k = typeof _.goal === "string" ? _.goal.trim() : void 0,
          x = k ? `Read thread: ${k}` : P ? `Read thread ${P}` : "Read thread";
        c({
          kind: "read",
          title: x
        }, m.status, b, y);
        continue;
      }
      if (p === "find_thread") {
        let P = typeof _.query === "string" ? _.query.trim() : void 0,
          k = P ? `Searched threads: ${P}` : "Searched threads";
        c({
          kind: "search",
          title: k
        }, m.status, b, y);
        continue;
      }
      if (p === "Task") {
        l(), u({
          kind: "generic",
          name: "Subagent",
          detail: ai(_),
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "oracle") {
        l();
        let P = typeof _.task === "string" ? _.task.trim() : void 0;
        u({
          kind: "generic",
          name: "oracle",
          detail: Ox0(P),
          args: hfT(m),
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "librarian") {
        l();
        let P = typeof _.query === "string" ? _.query.trim() : void 0;
        u({
          kind: "generic",
          name: "librarian",
          detail: dx0(P),
          args: hfT(m),
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "code_review") {
        l();
        let P = qx0(m, _);
        A({
          rowID: y,
          actions: P.actions,
          summary: P.summary,
          hasInProgress: gF(m.status),
          displayMode: i ? "aggman" : "default"
        }, b);
        continue;
      }
      if (p === "code_tour") {
        l();
        let P = Hx0(m, _);
        A({
          rowID: y,
          actions: P.actions,
          summary: P.summary,
          hasInProgress: gF(m.status),
          displayMode: i ? "aggman" : "default"
        }, b);
        continue;
      }
      if (p === "skill") {
        let P = typeof _.name === "string" ? _.name : void 0;
        c({
          kind: "read",
          title: P ? `Load skill: ${P}` : "Load skill"
        }, m.status, b, y);
        continue;
      }
      if (p === "undo_edit") {
        if (!W4(m.status)) continue;
        l(), u({
          kind: "edit",
          path: typeof _.path === "string" ? _.path : "(unknown)",
          status: m.status,
          diff: m.status === "done" && typeof m.result === "string" ? m.result : void 0,
          linesAdded: 0,
          linesDeleted: 0,
          error: aa(m)
        });
        continue;
      }
      if (p === "get_diagnostics") {
        let P = ms(p, _);
        c({
          kind: "read",
          title: P
        }, m.status, b, y);
        continue;
      }
      if (p === "look_at") {
        l();
        let P = typeof _.objective === "string" ? _.objective.trim() : void 0;
        u({
          kind: "generic",
          name: "look_at",
          detail: P ? `Looked at: ${P}` : ai(_),
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "mermaid") {
        l();
        let P = typeof _.code === "string" ? _.code : void 0;
        u({
          kind: "mermaid",
          code: P,
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "task_list") {
        l();
        let P = typeof _.action === "string" ? _.action.trim() : void 0,
          k = typeof _.title === "string" ? _.title.trim() : void 0,
          x = P && k ? `Task list: ${P} "${k}"` : P ? `Task list: ${P}` : "Task list";
        u({
          kind: "generic",
          name: "task_list",
          detail: x,
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "painter" || p === "render_agg_man") {
        l();
        let P = typeof _.prompt === "string" ? _.prompt.trim() : void 0,
          k = xx0(m);
        u({
          kind: "painter",
          title: p === "render_agg_man" ? "Render Agg Man" : void 0,
          prompt: P,
          status: m.status,
          images: k?.images ?? [],
          error: aa(m)
        });
        continue;
      }
      if (p === "slack_write") {
        l();
        let P = m.status === "done" ? "sent message" : "sending message\u2026";
        u({
          kind: "generic",
          name: "Slack",
          detail: P,
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      if (p === "slack_read") {
        l();
        let P = typeof _.type === "string" ? _.type : void 0,
          k;
        if (P === "channels") k = "searched channels";else if (P === "users") k = "searched users";else if (P === "thread") k = "read thread";else k = "read";
        u({
          kind: "generic",
          name: "Slack",
          detail: k,
          status: m.status,
          error: aa(m)
        });
        continue;
      }
      l(), u({
        kind: "generic",
        name: p,
        detail: ai(_),
        args: Nx0(_),
        status: m.status,
        error: aa(m)
      });
    }
  }
  l();
  let o = Px0(a);
  if (R.threadIsWorking) {
    let n = o.at(-1);
    if (n?.type === "activity-group") n.hasInProgress = !0;
  }
  return o;
}