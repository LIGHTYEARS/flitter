#!/usr/bin/env bun
// flitter-amp — ACP Client TUI
// A reverse-engineered Amp CLI built on flitter-core

import { parseArgs } from './state/config';
import { setLogLevel, log, initLogFile, closeLogFile } from './utils/logger';
import { setPipelineLogSink, resetPipelineLogSink } from 'flitter-core';
import { AppState } from './state/app-state';
import { connectToAgent, connectToAgentWithResume, sendPrompt, cancelPrompt } from './acp/connection';
import type { ConnectionHandle } from './acp/connection';
import { gracefulShutdown } from './acp/graceful-shutdown';
import { startTUI } from './app';
import { SessionStore } from './state/session-store';
import { exportToMarkdown, exportToText } from './state/session-export';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { writeFileSync } from 'node:fs';
import { setCwd } from './widgets/tool-call/resolve-tool-name';

async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  setLogLevel(config.logLevel);
  initLogFile(config.logRetentionDays);
  setPipelineLogSink((tag, msg) => log.debug(`[${tag}] ${msg}`));

  log.info('flitter-amp starting...');
  log.info(`Agent: ${config.agentCommand} ${config.agentArgs.join(' ')}`);
  log.info(`CWD: ${config.cwd}`);

  // Initialize session store
  const sessionStore = new SessionStore(
    join(homedir(), '.flitter'),
    config.sessionRetentionDays,
  );

  // Prune expired sessions on startup (synchronous, fast)
  sessionStore.prune();

  // Handle --list-sessions: print and exit
  if (config.listSessions) {
    const sessions = sessionStore.list();
    if (sessions.length === 0) {
      process.stdout.write('No saved sessions.\n');
    } else {
      process.stdout.write('Recent sessions:\n\n');
      for (const s of sessions.slice(0, 20)) {
        const date = new Date(s.updatedAt).toISOString().slice(0, 19).replace('T', ' ');
        const branch = s.gitBranch ? ` (${s.gitBranch})` : '';
        process.stdout.write(
          `  ${s.sessionId}  ${date}  ${s.messageCount} msgs${branch}\n` +
          `    ${s.summary}\n\n`,
        );
      }
    }
    process.exit(0);
  }

  // Handle --export: export most recent session to file and exit
  if (config.exportFormat) {
    const recent = sessionStore.mostRecent();
    if (!recent) {
      process.stderr.write('No sessions to export.\n');
      process.exit(1);
    }
    const session = sessionStore.load(recent.sessionId);
    if (!session) {
      process.stderr.write(`Failed to load session ${recent.sessionId}.\n`);
      process.exit(1);
    }
    let content: string;
    let ext: string;
    switch (config.exportFormat) {
      case 'md':
        content = exportToMarkdown(session);
        ext = 'md';
        break;
      case 'txt':
        content = exportToText(session);
        ext = 'txt';
        break;
      case 'json':
      default:
        content = JSON.stringify(session, null, 2);
        ext = 'json';
        break;
    }
    const outPath = `session-export.${ext}`;
    writeFileSync(outPath, content, 'utf-8');
    process.stdout.write(`Exported to ${outPath}\n`);
    process.exit(0);
  }

  // Create global app state
  const appState = new AppState();
  appState.cwd = config.cwd;
  setCwd(config.cwd);
  appState.agentCommand = `${config.agentCommand} ${config.agentArgs.join(' ')}`;

  // Detect git branch in the working directory
  try {
    const proc = Bun.spawnSync(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: config.cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (proc.exitCode === 0) {
      appState.gitBranch = proc.stdout.toString().trim() || null;
    }
  } catch {
    // Not a git repo or git not installed — leave as null
  }

  // Resolve resume session ID
  let resumeSessionId: string | null = null;
  if (config.resumeSessionId === 'latest') {
    const recent = sessionStore.mostRecent();
    if (recent) {
      resumeSessionId = recent.sessionId;
      log.info(`Resuming most recent session: ${resumeSessionId}`);
    } else {
      log.info('No sessions to resume; starting fresh');
    }
  } else if (config.resumeSessionId) {
    resumeSessionId = config.resumeSessionId;
  }

  // Connect to the ACP agent
  let handle: ConnectionHandle;
  try {
    if (resumeSessionId) {
      handle = await connectToAgentWithResume(
        config.agentCommand,
        config.agentArgs,
        config.cwd,
        appState,
        resumeSessionId,
      );
      // Restore local conversation state from saved session
      const savedSession = sessionStore.load(resumeSessionId);
      if (savedSession) {
        appState.restoreFromSession(savedSession);
        log.info(`Restored ${savedSession.items.length} conversation items from disk`);
      }
    } else {
      handle = await connectToAgent(
        config.agentCommand,
        config.agentArgs,
        config.cwd,
        appState,
      );
    }
    appState.setConnected(handle.sessionId, handle.agentInfo?.name ?? null);
    log.info('Connected to agent successfully');
  } catch (err) {
    log.error('Failed to connect to agent', err);
    closeLogFile();
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\nError: Failed to connect to agent "${config.agentCommand}"\n`);
    process.stderr.write(`  ${message}\n\n`);
    process.stderr.write('Make sure the agent is installed and supports the ACP protocol.\n');
    process.stderr.write('Examples:\n');
    process.stderr.write('  flitter-amp --agent "claude --agent"\n');
    process.stderr.write('  flitter-amp --agent "gemini --experimental-acp"\n');
    process.exit(1);
  }

  // Monitor agent process for unexpected exit (PROTO-04)
  handle.agent.onExit((code, signal) => {
    if (appState.isConnected) {
      const reason = signal ? `killed by ${signal}` : `exited with code ${code}`;
      log.error(`Agent process ${reason}`);
      appState.onConnectionClosed(reason);
    }
  });

  /**
   * Save the current session state to disk.
   * Called on prompt completion and application exit.
   */
  const saveSession = (): void => {
    const snapshot = appState.toSessionFile();
    if (snapshot && snapshot.items.length > 0) {
      sessionStore.save(snapshot);
    }
  };

  // Handle process cleanup (Gap #60: async gracefulShutdown)
  let shutdownInProgress = false;
  const shutdown = async () => {
    if (shutdownInProgress) return; // prevent double-shutdown
    shutdownInProgress = true;
    await gracefulShutdown({ handle, saveSession });
  };

  process.on('SIGINT', () => {
    log.info('Received SIGINT, shutting down...');
    shutdown().then(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    shutdown().then(() => process.exit(0));
  });

  // Prompt submission handler — sends text to agent via ACP
  const handleSubmit = async (text: string): Promise<void> => {
    log.info(`handleSubmit called: "${text}", sessionId: ${handle.sessionId}`);
    if (!handle.sessionId) return;
    appState.startProcessing(text);
    try {
      const result = await sendPrompt(handle.connection, handle.sessionId, text);
      appState.onPromptComplete(handle.sessionId, result.stopReason);
      // Auto-save after each prompt completion
      saveSession();
    } catch (err) {
      log.error('Prompt failed', err);
      const message = err instanceof Error ? err.message : String(err);
      appState.handleError(message);
    }
  };

  // Cancel handler — cancels current agent operation
  const handleCancel = async (): Promise<void> => {
    if (!handle.sessionId || !appState.isProcessing) {
      // Not processing — exit via graceful shutdown
      await shutdown();
      process.exit(0);
    }
    try {
      await cancelPrompt(handle.connection, handle.sessionId);
    } catch (err) {
      log.error('Cancel failed', err);
    }
  };

  // Start the TUI
  log.info('Starting TUI...');
  await startTUI(
    appState, handleSubmit, handleCancel,
    config.historySize, config.historyFile,
  );
}

main().catch((err) => {
  log.fatal('Fatal startup error', err);
  process.stderr.write(`\nFatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
