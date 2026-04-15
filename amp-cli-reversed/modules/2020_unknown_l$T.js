async function l$T(T, R, a) {
  ua(a, T);
  let e = await X3(R, T);
  try {
    let t = a.optsWithGlobals(),
      r = await m0(e.threadService.observeThreadList({
        includeArchived: t.includeArchived ?? !1
      })),
      h = s => {
        let A = s.meta?.visibility,
          l = s.meta?.sharedGroupIDs ?? [];
        switch (A) {
          case "public_discoverable":
            return "Public";
          case "public_unlisted":
            return "Unlisted";
          case "thread_workspace_shared":
            return "Workspace";
          case "private":
          default:
            return l.length > 0 ? o9(l.length, "Group") : "Private";
        }
      };
    if (r.length === 0) C9.write(`No threads found.
`), process.exit(0);
    let i = ["Title", "Last Updated", "Visibility", "Messages", "Thread ID"],
      c = r.map(s => {
        let A = s.title || "Untitled",
          l = h3R(new Date(s.userLastInteractedAt)),
          o = s.messageCount ?? s.summaryStats?.messageCount ?? 0;
        return [A, l, h(s), o.toString(), s.id];
      });
    i3R(i, c, {
      columnFormatters: [(s, A) => {
        return (s.length > A ? s.substring(0, A - 3) + "..." : s).padEnd(A);
      }, void 0, void 0, void 0, (s, A) => oR.green(s.padEnd(A))],
      truncateColumnIndex: 0
    }), await e.asyncDispose(), process.exit(0);
  } catch (t) {
    await e.asyncDispose(), d8(`Error listing threads: ${t instanceof Error ? t.message : String(t)}
`);
  }
}