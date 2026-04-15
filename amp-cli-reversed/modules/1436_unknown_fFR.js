function fFR(T, R, a) {
  return new AR(e => {
    (async () => {
      let t = T.checkScope ? zR.file(T.checkScope) : a.dir;
      if (!t) throw Error("No workspace root or scope provided");
      let r = T.targetFiles ?? (await xFR(t, T.diffDescription, a.configService)),
        h = await uFR(a.filesystem, r, t, [t], a.configService.userConfigDir),
        i = T.checkFilter ? h.allChecks.filter(A => T.checkFilter.includes(A.name)) : h.allChecks,
        c = {};
      if (i.length === 0) {
        e.next([]), e.complete();
        return;
      }
      for (let A of i) c[A.uri] = {
        check: A,
        status: {
          status: "in-progress",
          turns: []
        }
      };
      e.next([...Object.values(c)]);
      let s = i.map(A => IFR(A, r, T.diffDescription, R, a).pipe(JR(l => ({
        check: A,
        status: l
      }))));
      await eN(xj(...s).pipe(A => {
        return new AR(l => {
          let o = A.subscribe({
            next: ({
              check: n,
              status: p
            }) => {
              c[n.uri] = {
                check: n,
                status: p
              }, l.next(), e.next([...Object.values(c)]);
            },
            error: n => {
              l.error(n);
            },
            complete: () => {
              l.complete();
            }
          });
          return () => typeof o === "function" ? o() : o?.unsubscribe?.();
        });
      })), e.complete();
    })().catch(t => e.error(t));
  });
}