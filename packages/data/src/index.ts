// @flitter/data — Data persistence & state layer

// Thread
export { ThreadStore, snapshotToEntry, entryEquals, computeUserLastInteractedAt } from "./thread/thread-store";
export { ThreadPersistence } from "./thread/thread-persistence";
export type { ThreadEntry, ThreadStoreOptions, ThreadPersistenceOptions } from "./thread/types";

// Config
export { FileSettingsStorage } from "./config/settings-storage";
export type { FileSettingsStorageOptions } from "./config/settings-storage";
export { ConfigService } from "./config/config-service";
export type { ConfigServiceOptions } from "./config/config-service";
export { stripJsonComments } from "./config/jsonc";

// Skill
export { SkillService } from "./skill/skill-service";
export type { SkillServiceOptions } from "./skill/skill-service";
export { parseSkillFrontmatter, validateSkillName, loadSkill, scanSkillFiles } from "./skill/skill-parser";
export type { Skill, SkillFrontmatter, SkillFile, SkillScanResult, SkillInstallResult, MCPServerSpec } from "./skill/skill-types";

// Guidance
export { discoverGuidanceFiles, parseFrontmatter, matchGlobs, extractAtReferences, isRootDirectory } from "./guidance/guidance-loader";
export type { GuidanceFile, GuidanceFrontmatter, GuidanceLoadOptions, GuidanceType } from "./guidance/guidance-types";

// Context
export { ContextManager } from "./context/context-manager";
export type { CompactionState, CompactFunction, CompactionResult, ContextManagerOptions } from "./context/context-manager";
export { countTokensApprox, countMessageTokens, countThreadTokens } from "./context/token-counter";
