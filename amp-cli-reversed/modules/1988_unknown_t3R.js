function t3R(T) {
  return {
    toolService: T.toolService,
    configService: T.configService,
    skillService: T.skillService,
    getThreadEnvironment: Hs,
    filesystem: T.fileSystem,
    threadService: T.threadService
  };
}