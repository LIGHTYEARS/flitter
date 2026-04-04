#!/usr/bin/env bun

import { chdir } from 'node:process';

import { parseArgs } from './state/config';
import { closeLogFile, initLogFile, log, setLogLevel } from './utils/logger';
import { startAppShell } from './widgets/app-shell';
import { AnthropicProvider } from './provider/anthropic';
import { AppState } from './state/app-state';
import { PromptHistory } from './state/history';
import { SessionStore } from './state/session-store';
import { exportToMarkdown, exportToText } from './state/session-export';

/** Main entry point — parses config, creates provider and app state, starts TUI. */
async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  setLogLevel(config.logLevel);
  initLogFile(config.logRetentionDays);

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

  try {
    chdir(config.cwd);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: failed to enter cwd ${config.cwd}\n${message}\n`);
    process.exit(1);
  }

  log.info(`flitter-cli starting in ${config.cwd}`);

  let provider: AnthropicProvider;
  try {
    provider = new AnthropicProvider({
      apiKey: config.apiKey ?? undefined,
      model: config.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `\nError: ${message}\n\n` +
      `To use flitter-cli, set your API key:\n` +
      `  export ANTHROPIC_API_KEY=sk-ant-...\n\n` +
      `Or add it to ~/.flitter-cli/config.json:\n` +
      `  { "apiKey": "sk-ant-..." }\n\n`,
    );
    closeLogFile();
    process.exit(1);
  }

  const appState = AppState.create({
    cwd: config.cwd,
    provider,
    promptHistory,
    sessionStore,
  });

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

  const gracefulShutdown = () => {
    appState.saveSession();
    promptHistory.save();
  };

  process.on('SIGINT', () => {
    gracefulShutdown();
  });
  process.on('SIGTERM', () => {
    gracefulShutdown();
  });

  await binding.waitForExit();
  gracefulShutdown();
  closeLogFile();
}

main().catch((error) => {
  closeLogFile();
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`\nFatal error: ${message}\n`);
  process.exit(1);
});
