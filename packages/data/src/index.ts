// @flitter/data — Data persistence & state layer

export { getAdminSettingsPath, readAdminSettings } from "./config/admin-settings";
export type { ConfigServiceOptions } from "./config/config-service";
export { ConfigService } from "./config/config-service";
export { stripJsonComments } from "./config/jsonc";
export type { FileSettingsStorageOptions } from "./config/settings-storage";
// Config
export { FileSettingsStorage } from "./config/settings-storage";
export type {
  CompactFunction,
  CompactionResult,
  CompactionState,
  ContextManagerOptions,
} from "./context/context-manager";
// Context
export { ContextManager } from "./context/context-manager";
export { countMessageTokens, countThreadTokens, countTokensApprox } from "./context/token-counter";
// Git
export {
  GitFileWatcher,
  type FileSystemEvent,
  type FileSystemEventCallback,
  type GitFileChange,
  type GitFileWatcherOptions,
} from "./git/git-file-watcher";
// Guidance
export {
  discoverGuidanceFiles,
  extractAtReferences,
  isRootDirectory,
  matchGlobs,
  parseFrontmatter,
} from "./guidance/guidance-loader";
export type {
  GuidanceFile,
  GuidanceFrontmatter,
  GuidanceLoadOptions,
  GuidanceType,
} from "./guidance/guidance-types";
// Identity
export { getDeviceFingerprint, getOrCreateInstallationId } from "./identity/installation-id";
// MCP
export { McpRegistryClient, type McpRegistryClientOptions, type McpRegistryResult } from "./mcp/registry-client";
export { TrustStore } from "./mcp/trust-store";
// Memory
export { MemoryStore } from "./memory/memory-store";
export type { MemoryEntry, MemoryStoreData } from "./memory/memory-types";
export {
  loadSkill,
  parseSkillFrontmatter,
  scanSkillFiles,
  validateSkillName,
} from "./skill/skill-parser";
export type { SkillServiceOptions } from "./skill/skill-service";
// Skill
export { SkillService } from "./skill/skill-service";
export type {
  MCPServerSpec,
  Skill,
  SkillFile,
  SkillFrontmatter,
  SkillInstallResult,
  SkillScanResult,
} from "./skill/skill-types";
export { ThreadPersistence } from "./thread/thread-persistence";
// Thread
export {
  computeUserLastInteractedAt,
  entryEquals,
  snapshotToEntry,
  ThreadStore,
} from "./thread/thread-store";
export type { ThreadExclusiveReadWriter, ThreadVisibility } from "./thread/thread-store";
export {
  ThreadUploadManager,
  type ThreadRemoteTransport,
  type ThreadUploadManagerOptions,
} from "./thread/thread-upload";
export type { ThreadEntry, ThreadPersistenceOptions, ThreadStoreOptions } from "./thread/types";
