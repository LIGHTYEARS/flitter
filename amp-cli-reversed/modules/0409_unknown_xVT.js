async function xVT(T) {
  let R = await kVT(T.settingsFile ?? dA, dA),
    a = T.watchFactory ?? g_0,
    e = T.fallbackWatchFactory ?? $_0,
    t = T.debounceMs ?? 100,
    r = T.fileReadDelayMs ?? 10,
    h = new W0(),
    i,
    c,
    s,
    A = !1,
    l;
  async function o() {
    try {
      let u = Ih.dirname(R);
      await _S.mkdir(u, {
        recursive: !0
      });
    } catch (u) {
      throw J.error(`Failed to create config directory: ${u}`), u;
    }
  }
  async function n(u = !1) {
    if (i && !u) return i;
    _();
    try {
      let P = await _S.readFile(R, "utf-8"),
        k = [],
        x = O5T(P, k, {
          allowTrailingComma: !0
        });
      if (k.length > 0) {
        let v = k.map(g => {
          return P.substring(0, g.offset).split(`
`).length - 1;
        });
        throw new GR(`Invalid JSON in settings file ${R}`, 1, `Fix the JSON syntax errors. Errors found on lines [${v.join(", ")}].`);
      }
      J.debug("readSettings", {
        settingsPath: R,
        rawConfig: x
      });
      let f = {};
      for (let [v, g] of Object.entries(x)) if (v.startsWith("amp.")) {
        let I = v.substring(4);
        f[I] = g;
      }
      return i = f, f;
    } catch (P) {
      if (P.code === "ENOENT") return i = {}, i;
      throw J.error(`Failed to read settings: ${P}`), P;
    }
  }
  async function p(u) {
    await C4.acquire();
    try {
      await o(), await iY(R, P => {
        let k = P;
        for (let [x, f] of Object.entries(u)) {
          let v = QmT(k, [`amp.${x}`], f, {
            formattingOptions: {
              tabSize: 2,
              insertSpaces: !0
            }
          });
          if (v.length > 0) k = ZmT(k, v);
        }
        return {
          newContent: k
        };
      }, {
        mode: 384
      }), i = u;
    } catch (P) {
      throw J.error(`Failed to write settings: ${P}`), P;
    } finally {
      C4.release();
    }
  }
  function _() {
    if (A) return;
    try {
      l = e(R, (u, P) => {
        J.debug("Settings file change detected (fallback watcher)", {
          settingsPath: R,
          curr: u,
          prev: P
        }), m();
      }), A = !0, J.debug("Started watching settings file with fallback watcher (Bun)", {
        settingsPath: R
      });
    } catch (u) {
      J.error("Failed to start fallback file watcher", {
        settingsPath: R,
        error: u
      });
    }
    return;
  }
  function m() {
    if (s) clearTimeout(s);
    s = setTimeout(b, t);
  }
  async function b() {
    try {
      let u = i;
      i = void 0, await new Promise(x => setTimeout(x, r));
      let P = await n(!0),
        k = I_0(u, P);
      if (k.length > 0) i = void 0, h.next(k), J.info("Settings reloaded", {
        changedKeys: k
      });
    } catch (u) {
      J.warn("Failed to handle settings file change", {
        settingsPath: R,
        error: u
      });
    }
  }
  function y() {
    if (c) c.close(), c = void 0;
    if (l) l.close(), l = void 0;
    if (s) clearTimeout(s), s = void 0;
    A = !1, J.debug("Stopped watching settings directory", {
      settingsPath: R
    });
  }
  return {
    async get(u) {
      return (await n())[u];
    },
    async set(u, P, k) {
      let x = await n();
      x[u] = P, await p(x), h.next([u]);
    },
    async delete(u, P) {
      await C4.acquire();
      try {
        await iY(R, x => {
          let f = `amp.${u}`,
            v = QmT(x, [f], void 0, {
              formattingOptions: {
                tabSize: 2,
                insertSpaces: !0
              }
            });
          return {
            newContent: v.length > 0 ? ZmT(x, v) : x
          };
        }, {
          mode: 384
        });
        let k = await n();
        delete k[u], i = k, h.next([u]);
      } catch (k) {
        throw J.error(`Failed to delete setting: ${k}`), k;
      } finally {
        C4.release();
      }
    },
    async keys() {
      let u = await n();
      return Object.keys(u);
    },
    getSettingsFilePath() {
      return R;
    },
    changes: h,
    [Symbol.dispose]() {
      y();
    }
  };
}