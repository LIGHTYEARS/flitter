function JHR(T, R, a, e) {
  return new AR(t => {
    let r = new AbortController();
    return t.next({
      status: "in-progress",
      progress: []
    }), U5T(T, R ? {
      pattern: R,
      caseInsensitive: !0
    } : null, {
      ...a,
      signal: r.signal
    }, e).then(({
      files: h,
      remaining: i
    }) => {
      if (i > 0) h.push(`--- ${i} more files not shown ---`);
      t.next({
        status: "done",
        progress: h,
        result: h
      });
    }).catch(h => {
      let i = h instanceof Error ? h.message : String(h);
      t.next({
        status: "error",
        progress: [],
        error: {
          message: i
        }
      });
    }).finally(() => t.complete()), () => {
      r.abort();
    };
  });
}