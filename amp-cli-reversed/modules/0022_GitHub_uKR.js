function bKR(T) {
  if (T.settings.bitbucketToken) return "bitbucket-enterprise";
  return "github";
}
function uKR(T, R) {
  return new AR(a => {
    let e = null,
      t = !1;
    return a.next({
      status: "blocked-on-user",
      reason: "The Librarian needs to authenticate with GitHub to search for code on your behalf."
    }), T.toolService.requestApproval({
      threadId: T.thread.id,
      mainThreadId: T.thread.mainThreadID,
      toolUseId: T.toolUseID,
      toolName: uc,
      args: {},
      reason: "The Librarian needs to authenticate with GitHub to search for code on your behalf.",
      context: T.thread.mainThreadID ? "subagent" : "thread"
    }).then(r => {
      if (t) return;
      if (r) a.next({
        status: "in-progress"
      }), e = qX(R, T, "github").subscribe(a);else a.next({
        status: "rejected-by-user",
        reason: "GitHub authentication was cancelled."
      }), a.complete();
    }).catch(r => {
      if (t) return;
      J.error("GitHub auth approval request failed:", r), a.next({
        status: "error",
        error: {
          message: r instanceof Error ? r.message : "Approval request failed"
        }
      }), a.complete();
    }), () => {
      t = !0, e?.unsubscribe();
    };
  });
}