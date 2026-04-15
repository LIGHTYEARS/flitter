async function oHR() {
  let T = sHR();
  if (!T) return "{}";
  try {
    return await YUR.promises.readFile(T, "utf-8");
  } catch (R) {
    if (R.code === "ENOENT") return "{}";
    throw R;
  }
}
function Ms(T, R) {
  let a = CX.getValue();
  CX.next({
    ...a,
    [T]: R
  });
}
function LX({
  storage: T,
  secretStorage: R,
  workspaceRoot: a,
  defaultAmpURL: e = Lr,
  preferThreadEnv: t,
  homeDir: r,
  userConfigDir: h
}) {
  let i = Q9(async () => {
      let o = await T.keys();
      return Object.fromEntries(await Promise.all(o.map(async n => [n, await T.get(n)])));
    }).pipe(L9(o => sET(AR.of(o), T.changes.pipe(I2(async n => {
      return await Promise.all(n.map(async p => {
        let _ = await T.get(p);
        o[p] = _;
      })), {
        ...o
      };
    })))), JR(o => {
      let n = {
        ...o,
        url: o.url || e
      };
      if (n.permissions) n.permissions = I0T(n.permissions);
      return n;
    }), f3(), E9()),
    c = v3(R.changes.pipe(Y3(void 0)), i.pipe(JR(({
      url: o
    }) => o), E9())).pipe(I2(async ([, o]) => ({
      getToken: async (n, p) => {
        return R.get(n, p);
      },
      isSet: {
        [o]: Object.fromEntries(await Promise.all(oCT.map(async n => [n, !!(await R.get(n, o))])))
      }
    }))),
    s = v3(i, c, CX).pipe(E9(([o, n, p], [_, m, b]) => o === _ && n === m && p === b), JR(([o, n, p]) => ({
      settings: {
        ...o,
        ...p
      },
      secrets: n
    })), f3()),
    A = a.pipe(JR(o => ({
      workspaceFolders: o ? [d0(o)] : null,
      isWindows: JS().os === "windows",
      homeDir: typeof process === "object" && process.env.HOME ? d0(zR.file(process.env.HOME)) : void 0,
      preferThreadEnv: t
    }))),
    l = A.subscribe(o => {
      AET(o);
    });
  return {
    get(o, n) {
      return T.get(o, n);
    },
    updateSettings(o, n, p) {
      return T.set(o, n, p);
    },
    async appendSettings(o, n, p) {
      let _ = await T.get(o, p);
      if (_ === void 0) return T.set(o, n, p);else if (!Array.isArray(_)) throw Error(`Cannot append to non-array setting: ${o}`);else if (_.length === 0) return T.set(o, n, p);else {
        let m = [..._, ...n];
        return T.set(o, m, p);
      }
    },
    async prependSettings(o, n, p) {
      let _ = await T.get(o, p);
      if (_ === void 0) return T.set(o, n, p);else if (!Array.isArray(_)) throw Error(`Cannot prepend to non-array setting: ${o}`);else if (_.length === 0) return T.set(o, n, p);else {
        let m = [...n, ..._];
        return T.set(o, m, p);
      }
    },
    deleteSettings(o, n) {
      return T.delete(o, n);
    },
    updateSecret(o, n, p) {
      return R.set(o, n, p);
    },
    workspaceRoot: a,
    displayPathEnvInfo: A,
    homeDir: r,
    userConfigDir: h,
    config: s,
    async getLatest(o) {
      return m0(s, o);
    },
    unsubscribe() {
      l.unsubscribe();
    }
  };
}