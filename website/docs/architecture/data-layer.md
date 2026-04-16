# 数据层

`@flitter/data` 管理配置、会话、Skill 等持久化状态。

## 配置系统

`ConfigService` 提供分层配置管理：

```
默认值 → 全局配置(~/.flitter/) → 项目配置(.flitter/) → 环境变量 → CLI 参数
```

底层使用 `FileSettingsStorage` 读写 JSONC 格式的配置文件。

## 会话管理

### ThreadStore

内存中的会话状态管理：
- 创建/获取/列出会话
- 追加消息到会话历史

### ThreadPersistence

会话的磁盘持久化：
- 将会话序列化到磁盘
- 支持新建、继续、归档、删除会话

## 上下文管理

`ContextManager` 管理 LLM 的上下文窗口：
- `countTokensApprox()` — 近似 Token 计数
- 上下文窗口压缩（compaction）— 当上下文接近限制时自动压缩历史消息

## Skill 系统

`SkillService` 管理 Skill 文件：
- 扫描和解析 Skill 文件（支持 frontmatter 元数据）
- 每个 Skill 可关联 MCP 服务器配置
- 动态加载和热更新

## Guidance 系统

加载 CLAUDE.md 风格的引导文件：
- 支持 frontmatter 和 `@` 引用语法
- Glob 匹配决定哪些引导文件生效
- 为 Agent 提供项目级别的行为指导
