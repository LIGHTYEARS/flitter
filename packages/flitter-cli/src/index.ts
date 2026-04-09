#!/usr/bin/env bun

import { chdir } from 'node:process';

import { parseArgs } from './state/config';
import type { ConnectTarget } from './state/config';
import { closeLogFile, initLogFile, log, setLogLevel } from './utils/logger';
import { initPipelineBridge, teardownPipelineBridge } from './utils/pipeline-bridge';
import { startAppShell } from './widgets/app-shell';
import { createProvider } from './provider/factory';
import type { Provider } from './provider/provider';
import { AppState } from './state/app-state';
import { PromptHistory } from './state/history';
import { SessionStore } from './state/session-store';
import { exportToMarkdown, exportToText } from './state/session-export';
import { createDefaultRegistry } from './tools/defaults';
import { TaskExecutor } from './tools/task-executor';
import { buildSystemPrompt, loadProjectInstructions, getGitContext } from './provider/system-prompt';
import { loadSkills } from './state/skill-loader';

/**
 * Run OAuth authentication for the given target.
 * Authenticates, stores the token, and prints a success message.
 */
async function runConnect(target: ConnectTarget): Promise<void> {
  const write = (msg: string) => process.stdout.write(msg);

  switch (target) {
    case 'chatgpt': {
      write('Authenticating with ChatGPT/Codex...\n');
      write('A browser window will open. Sign in with your OpenAI account.\n\n');
      const { authenticateChatGPT } = await import('./auth/chatgpt-oauth');
      await authenticateChatGPT();
      write('\nChatGPT/Codex authentication successful!\n');
      write('You can now use: flitter-cli --provider chatgpt-codex\n');
      break;
    }
    case 'copilot': {
      write('Authenticating with GitHub Copilot...\n');
      const { authenticateCopilot } = await import('./auth/copilot-oauth');
      await authenticateCopilot();
      write('\nGitHub Copilot authentication successful!\n');
      write('You can now use: flitter-cli --provider copilot\n');
      break;
    }
    case 'antigravity': {
      write('Authenticating with Google Gemini (Antigravity)...\n');
      write('A browser window will open. Sign in with your Google account.\n\n');
      const { authenticateAntigravity } = await import('./auth/antigravity-oauth');
      await authenticateAntigravity();
      write('\nAntigravity (Google Gemini) authentication successful!\n');
      write('You can now use: flitter-cli --provider antigravity\n');
      break;
    }
  }
}

/** Main entry point — parses config, creates provider and app state, starts TUI. */
async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  setLogLevel(config.logLevel);
  initLogFile(config.logRetentionDays);
  initPipelineBridge();

  const promptHistory = new PromptHistory({
    filePath: config.historyFile,
    maxSize: config.historySize,
  });

  const sessionStore = new SessionStore({
    baseDir: config.sessionDir,
    retentionDays: config.sessionRetentionDays,
  });

  if (config.listSessions) {
    const sessions = sessionStore.list();
    if (sessions.length === 0) {
      process.stdout.write('No saved sessions.\n');
    } else {
      for (const entry of sessions) {
        const date = new Date(entry.updatedAt).toLocaleString();
        process.stdout.write(
          `${entry.sessionId}  ${date}  ${entry.messageCount} msgs  ${entry.summary}\n`,
        );
      }
    }
    closeLogFile();
    process.exit(0);
  }

  if (config.exportSession) {
    let sessionId = config.exportSession.sessionId;
    if (sessionId === '__most_recent__') {
      const recent = sessionStore.mostRecent();
      if (!recent) {
        process.stderr.write('Error: no sessions found to export\n');
        closeLogFile();
        process.exit(1);
      }
      sessionId = recent.sessionId;
    }
    const session = sessionStore.load(sessionId);
    if (!session) {
      process.stderr.write(`Error: session not found: ${sessionId}\n`);
      closeLogFile();
      process.exit(1);
    }
    let output: string;
    switch (config.exportSession.format) {
      case 'json':
        output = JSON.stringify(session, null, 2);
        break;
      case 'md':
        output = exportToMarkdown(session);
        break;
      case 'txt':
        output = exportToText(session);
        break;
    }
    process.stdout.write(output + '\n');
    closeLogFile();
    process.exit(0);
  }

  // Handle --connect: run OAuth authentication and exit
  if (config.connectTarget) {
    await runConnect(config.connectTarget);
    closeLogFile();
    process.exit(0);
  }

  try {
    chdir(config.cwd);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: failed to enter cwd ${config.cwd}\n${message}\n`);
    process.exit(1);
  }

  log.info(`flitter-cli starting in ${config.cwd}`);

  let provider: Provider;
  try {
    provider = createProvider(config.providerConfig);
    log.info(`Provider: ${provider.id} model=${provider.model} contextWindow=${provider.piModel.contextWindow} reasoning=${provider.piModel.reasoning}`);
    log.info(`ConfigService initialized with ${Object.keys(config.configService.snapshot()).length} settings`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `\nError: ${message}\n\n` +
      `To use flitter-cli, set an API key for your preferred provider:\n` +
      `  export ANTHROPIC_API_KEY=sk-ant-...     # Anthropic (default)\n` +
      `  export OPENAI_API_KEY=sk-...            # OpenAI\n` +
      `  export GEMINI_API_KEY=...               # Google Gemini\n` +
      `  export XAI_API_KEY=...                  # xAI (Grok)\n` +
      `  export GROQ_API_KEY=...                 # Groq\n\n` +
      `Or specify a provider explicitly:\n` +
      `  flitter-cli --provider openai --model gpt-4o\n\n` +
      `Or add it to ~/.flitter-cli/config.json:\n` +
      `  { "provider": "anthropic", "apiKey": "sk-ant-..." }\n\n`,
    );
    closeLogFile();
    process.exit(1);
  }

  // --- Build tool registry and system prompt ---
  const toolRegistry = createDefaultRegistry();

  const projectInstructions = loadProjectInstructions(config.cwd);
  const gitContext = await getGitContext(config.cwd);
  const displayCwd = gitContext.repoRoot ?? config.cwd;

  const systemPrompt = buildSystemPrompt({
    cwd: displayCwd,
    model: config.model,
    providerName: provider.id,
    tools: toolRegistry.getDefinitions(),
    gitBranch: gitContext.branch,
    gitLog: gitContext.log,
    projectInstructions,
  });

  log.info(`System prompt built: ${systemPrompt.length} chars, tools: ${toolRegistry.size}, git: ${gitContext.branch ?? 'none'}, repoRoot: ${displayCwd}`);

  // Replace Task stub executor with the real TaskExecutor now that provider + system prompt exist
  const taskExecutor = new TaskExecutor(provider, systemPrompt);
  toolRegistry.replaceExecutor('Task', taskExecutor);

  const appState = AppState.create({
    cwd: displayCwd,
    gitBranch: gitContext.branch,
    provider,
    promptHistory,
    sessionStore,
    toolRegistry,
    systemPrompt,
    defaultToolExpanded: config.defaultToolExpanded,
  });

  // Load skills from local (.agents/skills/) and global (~/.agents/skills/) directories
  const skillResult = loadSkills(displayCwd);
  appState.skillService.setSkills(skillResult.skills, skillResult.errors, skillResult.warnings);
  log.info(`Skills loaded: ${skillResult.skills.length} skills, ${skillResult.errors.length} errors, ${skillResult.warnings.length} warnings`);

  if (config.resumeSessionId) {
    let sessionId = config.resumeSessionId;
    if (sessionId === '__most_recent__') {
      const recent = sessionStore.mostRecent();
      if (recent) {
        sessionId = recent.sessionId;
      } else {
        log.info('No recent session to resume — starting fresh');
        sessionId = '';
      }
    }
    if (sessionId) {
      const session = sessionStore.load(sessionId);
      if (session) {
        appState.restoreFromSession(session);
        log.info(`Resumed session: ${sessionId}`);
      } else {
        log.warn(`Session not found: ${sessionId} — starting fresh`);
      }
    }
  }

  sessionStore.prune();

  const binding = await startAppShell({ appState, themeName: config.theme });

  let shutdownInProgress = false;

  async function gracefulShutdown(): Promise<void> {
    if (shutdownInProgress) return;
    shutdownInProgress = true;

    const deadline = new Promise<void>((resolve) => setTimeout(resolve, 8000));
    const work = async () => {
      try {
        appState.shutdown();
        promptHistory.save();
      } catch { /* ignore */ }
    };

    await Promise.race([work(), deadline]);
  }

  process.on('SIGINT', () => {
    log.info('Received SIGINT, shutting down...');
    gracefulShutdown().then(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    log.info('Received SIGTERM, shutting down...');
    gracefulShutdown().then(() => process.exit(0));
  });

  await binding.waitForExit();
  await gracefulShutdown();
  teardownPipelineBridge();
  closeLogFile();
}

main().catch((error) => {
  closeLogFile();
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`\nFatal error: ${message}\n`);
  process.exit(1);
});
