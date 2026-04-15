async function NIT(T, R) {
  let a = await R.threadService.get(T);
  if (!a) throw new GR(`Thread ${T} does not exist.`, 1);
  return a;
}
function fD0() {
  return {
    v: 1,
    id: Eh(),
    created: Date.now(),
    messages: [],
    nextMessageId: 0
  };
}
function ID0(T) {
  let R = fD0(),
    a = XP(),
    e = new f0({
      threadState: a,
      currentThread: R,
      currentThreadID: R.id,
      recentThreadIDs: [],
      threadViewStates: {},
      threadTitles: {},
      pendingApprovals: [],
      pendingSkills: []
    }),
    t = {
      threadState: XP(),
      approvals: [],
      skills: []
    },
    r = [],
    h = {},
    i = {},
    c = null,
    s = () => {
      let n = t.threadState,
        p = n.mainThread ?? e.getValue().currentThread,
        _ = n.mainThread === null ? h : {
          ...h,
          [n.mainThread.id]: n.viewState
        };
      e.next({
        threadState: n,
        currentThread: p,
        currentThreadID: p.id,
        recentThreadIDs: r,
        threadViewStates: _,
        threadTitles: i,
        pendingApprovals: t.approvals,
        pendingSkills: t.skills
      }), h = _;
    },
    A = T.threadHandles$.pipe(L9(n => {
      if (c?.unsubscribe(), c = null, !n) return t = {
        threadState: XP(),
        approvals: [],
        skills: []
      }, s(), AR.of(null);
      return c = v3(n.threadState$, n.pendingApprovals$, n.pendingSkills$).pipe(JR(([p, _, m]) => ({
        threadState: p,
        approvals: _,
        skills: m
      }))).subscribe(p => {
        t = p, s();
      }), AR.of(null);
    })).subscribe(() => {
      return;
    }),
    l = T.recentThreadIDs$.subscribe(n => {
      r = n, s();
    }),
    o = T.threadTitles$.subscribe(n => {
      i = n, s();
    });
  return {
    state$: e,
    subscription: {
      unsubscribe: () => {
        A.unsubscribe(), c?.unsubscribe(), l.unsubscribe(), o.unsubscribe();
      }
    }
  };
}