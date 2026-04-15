async function Qz0(T) {
  J.info("[createDTWThreadPool] Creating DTW thread pool", {
    threadId: T.threadId,
    ampURL: T.ampURL,
    workerUrl: process.env.AMP_WORKER_URL
  });
  try {
    let R = new jrT({
      threadService: T.threadService,
      configService: T.configService,
      mcpService: T.mcpService,
      clientID: T.clientID,
      initialToolDiscovery: Promise.all([T.mcpService.initialized, T.toolboxService.initialized]).then(() => {
        return;
      }),
      toolService: T.toolService,
      skillService: T.skillService,
      getThreadEnvironment: Hs,
      osFileSystem: T.fileSystem,
      fileChangeTrackerStorage: new Im(T.fileSystem),
      ampURL: T.ampURL,
      useThreadActors: T.useThreadActors
    });
    if (T.threadId) await R.switchThread(T.threadId);else await R.createThread();
    return R;
  } catch (R) {
    throw J.error("[createDTWThreadPool] Failed to create DTW thread pool", {
      threadId: T.threadId,
      error: R
    }), R;
  }
}