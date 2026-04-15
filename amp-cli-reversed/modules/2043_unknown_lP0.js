async function lP0(T) {
  let R = T.stdout ?? Ne.stdout,
    a = T.stderr ?? Ne.stderr,
    e = T.applyOnce === !0,
    t = T.promptForEnter ?? JP0,
    r = T.promptForYesNo ?? null,
    h = r ?? Rk0,
    i = T.checkoutMode ?? "prompt",
    c = T.workerURL ?? Pi(T.ampURL),
    s = await mP0(T.cwd ?? Ne.cwd()),
    A = await QP0({
      threadId: T.threadId,
      threadService: T.threadService
    }),
    l = await Cy0({
      pidFilePath: await uP0(s),
      currentThreadId: T.threadId,
      currentThreadTitle: A.title,
      promptForYesNo: r ? o => r(Uw(o, R)) : void 0,
      formatRunningPrompt: ({
        runningPID: o,
        runningThreadId: n,
        runningThreadTitle: p
      }) => EP0({
        output: R,
        runningPID: o,
        runningThreadId: n,
        runningThreadTitle: p
      })
    });
  if (l.status !== "claimed") throw new GR(yP0(l), 1);
  try {
    await AP0({
      threadId: T.threadId,
      threadInfo: A,
      configService: T.configService,
      threadService: T.threadService,
      apiKey: T.apiKey,
      applyOnce: e,
      workerURL: c,
      checkoutMode: i,
      checkoutPrompt: h,
      promptForEnter: t,
      promptForYesNo: r,
      stdout: R,
      stderr: a,
      repoRoot: s,
      initialGitStatusTimeoutMs: T.initialGitStatusTimeoutMs
    });
  } finally {
    await l.release();
  }
}