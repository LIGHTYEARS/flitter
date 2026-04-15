function cP0(T) {
  let R = !1,
    a = null,
    e = T.initialArchived,
    t,
    r = () => {
      if (a !== null) clearTimeout(a), a = null;
    },
    h = new Promise(s => {
      t = s;
    }),
    i = () => {
      if (R) return;
      a = setTimeout(() => {
        c();
      }, T.pollIntervalMs ?? qy0);
    },
    c = async () => {
      if (R) return;
      try {
        let s = await T.loadArchived();
        if (R) return;
        if (e === !1 && s) {
          R = !0, r(), t();
          return;
        }
        e = s;
      } catch (s) {
        if (R) return;
        T.onCheckError?.(s);
      }
      i();
    };
  return i(), {
    archivedTransition: h,
    dispose: () => {
      R = !0, r();
    }
  };
}