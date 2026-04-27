# 数据层

:::info 本页面适合...
本页面适合想要深入了解 Flitter 内部架构的开发者。如果你只是使用框架构建 TUI 应用，可以跳过这部分。对于大多数开发者来说，最常用的是 `ConfigService`（读取配置）和 `ThreadStore`（管理会话），可以直接跳到对应小节。
:::

`@flitter/data` 管理配置、会话、Skill、信任存储等持久化状态。

---

## 用户常用服务

以下服务是日常开发中最常接触的部分。

### 配置系统

:::tip 最常用的服务之一
`ConfigService` 是大多数开发者会用到的核心服务——它管理 Flitter 的所有配置项，支持多级覆盖。
:::

`ConfigService` 提供分层配置管理：

```
默认值 → 全局配置(~/.flitter/) → 项目配置(.flitter/) → 环境变量 → CLI 参数
```

底层使用 `FileSettingsStorage` 读写 JSONC 格式的配置文件。

## 会话管理

:::tip 最常用的服务之一
`ThreadStore` 是管理聊天会话的核心服务。如果你要实现会话历史、消息持久化等功能，这是你需要了解的部分。
:::

### ThreadStore

内存中的会话状态管理：
- 创建/获取/列出会话
- 追加消息到会话历史

### ThreadPersistence

会话的磁盘持久化：
- 将会话序列化到磁盘
- 支持新建、继续、归档、删除会话

### 线程上传管道

`ThreadUploadManager` 将本地会话同步到远程存储：

```ts
interface ThreadRemoteTransport {
  uploadThread(thread: ThreadSnapshot): Promise<void>;
  getThread(id: string): Promise<ThreadSnapshot | null>;
  listThreads(opts?: { limit?: number }): Promise<ThreadEntry[]>;
  deleteThread(id: string): Promise<void>;
}
```

- 节流上传循环，防止频繁写入
- 基于版本号的去重（`uploadedVersionByThreadID`）
- 飞行中请求去重，避免重复上传同一线程

### 线程导航

`ThreadNavigator` 提供浏览器风格的线程前进/后退导航：

- 维护 `backStack` 和 `forwardStack` 两个历史栈
- `navigateBack()` / `navigateForward()` — 弹出对应栈，推入另一栈
- `recordNavigation(threadId)` — 记录新导航，清空前进栈
- 导航失败时自动回滚（rollback on error）
- 支持 `/back` 和 `/forward` 斜杠命令

---

## 内部服务

以下服务主要在框架内部使用，日常开发中较少直接接触。

### 上下文管理

`ContextManager` 管理 LLM 的上下文窗口：
- `countTokensApprox()` — 近似 Token 计数
- 上下文窗口压缩（compaction）— 当上下文接近限制时自动压缩历史消息

### MCP 信任存储

`TrustStore` 管理受信任的 MCP 服务器列表：

- 基于 `ConfigService` 持久化信任配置
- `approve(serverName)` / `revoke(serverName)` — 添加/撤销信任
- `isTrusted(serverName)` — 检查服务器是否受信任
- 工作区级 MCP 服务器在首次连接时需要用户审批

### Skill 系统

`SkillService` 管理 Skill 文件：
- 扫描和解析 Skill 文件（支持 frontmatter 元数据）
- 每个 Skill 可关联 MCP 服务器配置
- 三级发现路径：内置 → 项目级（`.flitter/skills/`）→ 用户级
- 动态加载和热更新

### Guidance 系统

加载 CLAUDE.md 风格的引导文件：
- 支持 frontmatter 和 `@` 引用语法
- Glob 匹配决定哪些引导文件生效
- 为 Agent 提供项目级别的行为指导

### 记忆系统

`MemoryService` 提供跨会话的持久化记忆：
- 记忆文件存储在 `~/.claude/projects/` 目录
- 支持用户偏好、反馈、项目上下文、外部引用等记忆类型
- 通过 `MEMORY.md` 索引文件管理记忆目录

### Git 工具

`@flitter/data` 内置 Git 操作辅助工具：
- 检测当前分支、状态、diff
- 用于 Agent 感知项目 Git 状态

## 何时需要了解这些

| 场景 | 需要了解的部分 |
|------|---------------|
| 读取/修改配置 | ConfigService（用户常用） |
| 管理聊天会话 | ThreadStore、ThreadPersistence（用户常用） |
| 同步会话到远程 | ThreadUploadManager |
| 管理 MCP 服务器信任 | TrustStore |
| 编写自定义 Skill | SkillService |
| 添加项目级引导规则 | Guidance 系统 |
| 实现跨会话记忆 | MemoryService |
