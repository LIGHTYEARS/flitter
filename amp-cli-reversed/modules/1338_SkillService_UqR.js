function UqR({
  configService: T,
  filesystem: R,
  options: a = {}
}) {
  let e = null,
    t = new W0(),
    r = a.watchFactory ?? CqR,
    h = a.debounceMs ?? DqR,
    i = a.workspaceRootsDebounceMs ?? wqR,
    c = a.enableWatching ?? !0,
    s = new Map(),
    A,
    l = !1,
    o = T.workspaceRoot.pipe(JR(aT => aT ? d0(aT) : null), E9()),
    n = o.pipe(KS(i), L9(aT => {
      e?.abort();
      let oT = new AbortController();
      return e = oT, new AR(TT => {
        async function tT() {
          try {
            let {
                settings: N
              } = await T.getLatest(),
              q = await P7T(R, aT ? [aT] : [], oT.signal, N);
            J.info("SkillService loaded skills", {
              skillCount: q.skills.length,
              skillNames: q.skills.map(F => F.name),
              errorCount: q.errors.length,
              workspaceRoot: aT
            }), TT.next(q);
          } catch (N) {
            if (oT.signal.aborted) {
              J.debug("SkillService scan aborted");
              return;
            }
            J.warn("SkillService failed to load skills", {
              error: N
            }), TT.next({
              skills: [],
              errors: [],
              warnings: []
            });
          }
        }
        tT();
        let lT = t.subscribe(N => {
          J.info("SkillService reload triggered", {
            reason: N
          }), tT();
        });
        return () => {
          lT.unsubscribe(), oT.abort();
        };
      });
    }), BnR((aT, oT) => NqR(aT, oT), {
      skills: [],
      errors: [],
      warnings: []
    }), f3({
      shouldCountRefs: !1
    })),
    p = n.pipe(JR(aT => aT.skills)),
    _ = n.pipe(JR(aT => aT.errors)),
    m = n.pipe(JR(aT => aT.warnings)),
    b,
    y = new Promise(aT => {
      b = aT;
    }),
    u = n.subscribe(() => {
      b();
    }),
    P = p.pipe(JR(aT => {
      let oT = {};
      for (let TT of aT) {
        if (!TT.mcpServers) continue;
        for (let [tT, lT] of Object.entries(TT.mcpServers)) {
          let N = oT[tT];
          if (!N) {
            let hT = lT.includeTools ? {
              [TT.name]: lT.includeTools
            } : void 0;
            oT[tT] = {
              ...lT,
              _ampSkillName: TT.name,
              _ampSkillNames: [TT.name],
              _ampSkillIncludeTools: hT
            };
            continue;
          }
          let q = N._ampSkillNames ?? (N._ampSkillName ? [N._ampSkillName] : []),
            F = q.includes(TT.name) ? q : [...q, TT.name],
            E = {
              ...N,
              includeTools: void 0,
              _ampSkillName: void 0,
              _ampSkillNames: void 0,
              _ampSkillIncludeTools: void 0
            },
            U = {
              ...lT,
              includeTools: void 0,
              _ampSkillName: void 0,
              _ampSkillNames: void 0,
              _ampSkillIncludeTools: void 0
            };
          if (JSON.stringify(E) !== JSON.stringify(U)) {
            J.warn("Skill MCP server name collision with different specs", {
              serverName: tT,
              firstSkill: q[0],
              conflictingSkill: TT.name
            });
            continue;
          }
          let Z = Array.from(new Set([...(N.includeTools ?? []), ...(lT.includeTools ?? [])])),
            X = Z.length > 0 ? Z : void 0,
            rT = {
              ...(N._ampSkillIncludeTools ?? {})
            };
          if (lT.includeTools) rT[TT.name] = lT.includeTools;
          oT[tT] = {
            ...lT,
            includeTools: X,
            _ampSkillName: F[0],
            _ampSkillNames: F,
            _ampSkillIncludeTools: Object.keys(rT).length > 0 ? rT : void 0
          };
        }
      }
      if (Object.keys(oT).length > 0) J.info("SkillService derived MCP servers from skills", {
        serverCount: Object.keys(oT).length,
        serverNames: Object.keys(oT)
      });
      return oT;
    }), f3({
      shouldCountRefs: !0
    })),
    k = p.pipe(JR(aT => {
      let oT = {};
      for (let TT of aT) oT[TT.name] = TT.baseDir;
      if (Object.keys(oT).length > 0) J.info("SkillService derived base dirs from skills", {
        skillCount: Object.keys(oT).length,
        skillNames: Object.keys(oT)
      });
      return oT;
    }), f3({
      shouldCountRefs: !0
    }));
  function x(aT) {
    let oT = [],
      TT = DX.homedir();
    if (aT) try {
      let tT = Ht(aT);
      oT.push(xt(tT.fsPath, ".agents", "skills")), oT.push(xt(tT.fsPath, ".claude", "skills"));
    } catch {}
    return oT.push(xt(TT, ".config", "agents", "skills")), oT.push(xt(TT, ".config", "amp", "skills")), oT.push(xt(TT, ".claude", "skills")), oT;
  }
  async function f(aT) {
    if (l || s.has(aT)) return;
    try {
      await BqR(rqR.access(aT), MqR, "watcher access check");
      try {
        let oT = r(aT, (TT, tT) => {
          if (tT && (tT.endsWith("SKILL.md") || tT.endsWith("skill.md"))) J.debug("Skill directory change detected", {
            directory: aT,
            eventType: TT,
            filename: tT
          }), v();
        });
        oT.on("error", TT => {
          J.debug("Transient skill file watcher error", {
            directory: aT,
            error: TT
          }), v();
        }), s.set(aT, oT), J.debug("Started watching skill directory", {
          directory: aT
        });
      } catch (oT) {
        J.warn("Failed to setup skill file watcher", {
          directory: aT,
          error: oT
        });
      }
    } catch {
      J.debug("Skipping watch for non-existent skill directory", {
        directory: aT
      });
    }
  }
  function v() {
    if (l) return;
    if (A) clearTimeout(A);
    A = setTimeout(() => {
      t.next("file-change");
    }, h);
  }
  function g() {
    try {
      for (let [aT, oT] of s) try {
        oT.close(), J.debug("Stopped watching skill directory", {
          directory: aT
        });
      } catch (TT) {
        J.warn("Failed to close skill watcher", {
          directory: aT,
          error: TT
        });
      }
      s.clear();
    } finally {
      if (A) clearTimeout(A), A = void 0;
    }
  }
  async function I(aT) {
    if (l || !c) return;
    g();
    let oT = x(aT);
    for (let TT of oT) await f(TT);
  }
  if (c) o.subscribe(aT => {
    I(aT).catch(oT => {
      J.warn("Failed to setup skill watching", {
        error: oT
      });
    });
  });
  async function S() {
    let aT = await m0(o);
    if (aT) {
      let oT = Ht(aT);
      return xt(oT.fsPath, ".agents", "skills");
    }
    return xt(process.cwd(), ".agents", "skills");
  }
  function O() {
    let aT = [],
      oT = xt(process.cwd(), ".agents", "skills");
    if (Xu(oT)) aT.push({
      path: oT,
      label: "workspace"
    });
    let TT = xt(DX.homedir(), ".config", "amp", "skills");
    if (Xu(TT)) aT.push({
      path: TT,
      label: "global"
    });
    return aT;
  }
  function j(aT) {
    let oT = hqR(aT);
    if (Xu(oT)) return oT;
    let TT = O();
    for (let tT of TT) {
      let lT = xt(tT.path, aT);
      if (Xu(lT)) {
        let N = xt(lT, "SKILL.md"),
          q = xt(lT, "skill.md");
        if (Xu(N) || Xu(q)) return lT;
      }
    }
    return null;
  }
  async function d() {
    return m0(p);
  }
  async function C() {
    return m0(_);
  }
  async function L() {
    return m0(m);
  }
  async function w(aT) {
    return (await d()).find(oT => oT.name === aT);
  }
  async function D() {
    let aT = await d();
    return k7T(aT);
  }
  function B(aT) {
    t.next(aT);
  }
  async function M(aT, oT, TT) {
    let tT = oT ?? (await S()),
      lT = await J5T(aT, tT, TT);
    return B("install"), lT;
  }
  async function V(aT, oT) {
    let TT = oT ?? (await S()),
      tT = TzT(aT, TT);
    if (tT) B("remove");
    return tT;
  }
  function Q(aT) {
    let oT = aT ?? xt(process.cwd(), ".agents", "skills");
    return bqR(oT);
  }
  function W(aT) {
    let oT = aT ?? xt(process.cwd(), ".agents", "skills");
    return yqR(oT);
  }
  function eT(aT) {
    return EqR(aT);
  }
  function iT() {
    l = !0, u.unsubscribe(), g(), e?.abort(), t.complete();
  }
  return {
    initialized: y,
    skills: p,
    skillErrors: _,
    skillWarnings: m,
    skillMCPServers: P,
    skillBaseDirs: k,
    getSkills: d,
    getSkillErrors: C,
    getSkillWarnings: L,
    getSkill: w,
    getSkillsList: D,
    reload: B,
    getTargetDir: S,
    resolveSkillPath: j,
    install: M,
    remove: V,
    listInstalled: Q,
    listInstalledWithInfo: W,
    collectFiles: eT,
    dispose: iT
  };
}