async function OS(T, R) {
  await iB(a => k40(a, T, R));
}
async function o$T(T, R, a) {
  let e = Date.now(),
    [t, r] = await Promise.all([N3.getThreadLinkInfo({
      thread: T
    }, {
      config: R
    }), a]);
  if (J.info(`[fetchAndStartThread] Ownership check in ${Date.now() - e}ms`), t.ok) {
    let h = t.result.creatorUserID;
    if (h && h !== r && !process.env.AMP_RESUME_OTHER_USER_THREADS_INSECURE) throw new GR(`Cannot resume thread created by another user.

This thread belongs to a different user and cannot be continued for security reasons. Set AMP_RESUME_OTHER_USER_THREADS_INSECURE=1 to bypass this check.`);
  }
}