async function yhT(T) {
  return {
    ...T,
    getThreadEnvironment: Hs,
    osFileSystem: T.fileSystem,
    skillService: T.skillService,
    fileChangeTrackerStorage: new Im(T.fileSystem),
    generateThreadTitle: tzT,
    deleteThread: R => T.threadService.delete(R),
    getServerStatus: () => ln(T.configService),
    pluginService: T.pluginService
  };
}