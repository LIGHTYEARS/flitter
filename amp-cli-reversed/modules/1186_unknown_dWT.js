function $A(T, R, a = "file") {
  let e = N_(T ?? ""),
    t = N_(R);
  return iM(a.toString(), a.toString(), e, t, "original", "modified", {
    ignoreWhitespace: !0
  });
}
function N_(T) {
  return T.replace(/\r\n/g, `
`);
}
function SWT(T) {
  T = T.replace(/^\\ No newline at end of file(?:\r?\n|$)/gm, "");
  let R = 3;
  while (T.includes("`".repeat(R))) R++;
  return `${"`".repeat(R)}diff
${T}${"`".repeat(R)}`;
}
function p7R(T) {
  if (T.before === void 0 && T.after === void 0) throw Error("unreachable");
  if (T.before === null && T.after === null) throw Error("unreachable");
}
function dWT(T, R, a) {
  let e = new Map(),
    t = h => {
      let i;
      for (let [c, s] of e.entries()) for (let [A, l] of s.entries()) {
        if (!MR.equalURIs(A, h)) continue;
        if (!i || l.timestamp < i.timestamp) i = l;
      }
      return i;
    },
    r = async ({
      filesFilter: h,
      toolUsesToRevert: i,
      pruneRevertedToolUses: c
    }) => {
      let s = new xh(),
        A = new Map();
      for (let [o, n] of e.entries()) {
        let p = i ? i.has(o) : !0;
        for (let [_, m] of n.entries()) {
          if (h && !h(_)) continue;
          if (m.reverted) continue;
          let b = s.get(_) || {
            changesAfterKeep: []
          };
          if (!p) {
            if (!b.latestKeepChange || m.timestamp > b.latestKeepChange.timestamp) b.latestKeepChange = m;
          } else b.changesAfterKeep.push(m), A.set(m, o);
          s.set(_, b);
        }
      }
      let l = Array.from(s.entries()).filter(([, {
        changesAfterKeep: o
      }]) => o.length > 0);
      if (await g7T(l, _7R, async ([o, {
        latestKeepChange: n,
        changesAfterKeep: p
      }]) => {
        try {
          let _ = p.reduce((b, y) => y.timestamp < b.timestamp ? y : b),
            m = n ? n.after : _.isNewFile ? null : _.before;
          await a(o, m), TG(o, R, Date.now());
          for (let b of p) {
            b.reverted = !0;
            let y = A.get(b);
            if (y) try {
              let u = {
                toolUseID: y,
                fileChangeID: b.id
              };
              await T.store(R, u, b);
            } catch (u) {
              J.error(`Error updating backup for file ${o}:`, u);
            }
          }
        } catch (_) {
          J.error(`Error reverting file ${o}:`, _);
        }
      }), c && i) for (let o of i) e.delete(o);
    };
  return {
    async getAllRecords() {
      return e;
    },
    async record(h) {
      if (!h.toolUse) return;
      let i = e.get(h.toolUse);
      if (!i) i = new xh(), e.set(h.toolUse, i);
      let c = i.get(h.uri),
        s = t(h.uri),
        A = c?.before ?? h.before ?? "",
        l = c?.isNewFile ?? h.before === null,
        o = s ? $A(s.before ?? "", h.after ?? "", h.uri) : $A(A, h.after ?? "", h.uri),
        n = c?.id ?? crypto.randomUUID(),
        p = {
          id: n,
          uri: d0(h.uri),
          before: A,
          after: h.after ?? "",
          diff: o,
          isNewFile: l,
          reverted: !1,
          timestamp: Date.now()
        };
      TG(h.uri, R, p.timestamp), i.set(h.uri, p), await T.store(R, {
        toolUseID: h.toolUse,
        fileChangeID: n
      }, p), J.debug("Recorded file change", {
        isNewFile: l,
        isUpdate: !!c,
        filePath: h.uri.toString(),
        toolUseID: h.toolUse
      });
    },
    async restoreFromBackups() {
      let h = (await T.list(R)) ?? [];
      e.clear();
      for (let i of h) {
        let {
            toolUseID: c
          } = i,
          s = await T.load(R, i);
        if (!s) continue;
        if (!e.has(c)) e.set(c, new xh());
        e.get(c).set(s.uri, s);
      }
      return {
        totalBackups: h.length
      };
    },
    async revertAll(h) {
      let i = new Set();
      for (let [c] of e.entries()) i.add(c);
      await r({
        filesFilter: h ? c => MR.equalURIs(c, h) : void 0,
        toolUsesToRevert: i,
        pruneRevertedToolUses: !1
      });
    },
    async revertChanges(h) {
      await r({
        toolUsesToRevert: h,
        pruneRevertedToolUses: !0
      });
    },
    getFilesForToolUses(h) {
      let i = new xh();
      for (let [c, s] of e.entries()) {
        if (!h.has(c)) continue;
        for (let [A, l] of s.entries()) {
          if (l.reverted) continue;
          i.set(A, !0);
        }
      }
      return Array.from(i.keys()).map(d0);
    },
    async cleanupBackups() {
      await T.cleanup(R);
    },
    async getLastEdit(h) {
      let i,
        c,
        s = 0;
      for (let [o, n] of e.entries()) {
        let p = n.get(h);
        if (p && !p.reverted && p.timestamp >= s) i = p, c = o, s = p.timestamp;
      }
      if (!i || !c) return;
      let A = i,
        l = c;
      return {
        oldContent: A.before,
        newContent: A.after,
        revert: async () => {
          A.reverted = !0, await T.store(R, {
            toolUseID: l,
            fileChangeID: A.id
          }, A);
        }
      };
    },
    dispose() {
      e.clear();
    }
  };
}