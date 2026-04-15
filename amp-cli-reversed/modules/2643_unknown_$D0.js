async function $D0(T) {
  if (!T.isInternalUser) throw new GR("DTW thread pool harness is only available for Amp employees", 1);
  let R = `cli-tui-${iD0(16).toString("hex")}`,
    a = new jrT({
      threadService: T.threadService,
      configService: T.configService,
      mcpService: T.mcpService,
      clientID: R,
      initialToolDiscovery: Promise.all([T.mcpService.initialized, T.toolboxService.initialized]).then(() => {
        return;
      }),
      toolService: T.toolService,
      skillService: T.skillService,
      getThreadEnvironment: T.getThreadEnvironment,
      fileChangeTrackerStorage: new Im(T.fileSystem),
      osFileSystem: T.fileSystem,
      ampURL: T.ampURL
    });
  if (T.threadId) await a.switchThread(T.threadId);else await a.createThread();
  return {
    threadPool: a
  };
}