#!/usr/bin/env bun
// flitter-amp — ACP Client TUI
// A reverse-engineered Amp CLI built on flitter-core

import { parseArgs } from './state/config';
import { setLogLevel, log, initLogFile, closeLogFile } from './utils/logger';
import { AppState } from './state/app-state';
import { connectToAgent, sendPrompt, cancelPrompt } from './acp/connection';
import type { ConnectionHandle } from './acp/connection';
import { startTUI } from './app';

async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  setLogLevel(config.logLevel);
  initLogFile();

  log.info('flitter-amp starting...');
  log.info(`Agent: ${config.agentCommand} ${config.agentArgs.join(' ')}`);
  log.info(`CWD: ${config.cwd}`);

  // Create global app state
  const appState = new AppState();
  appState.cwd = config.cwd;

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

  // Connect to the ACP agent
  let handle: ConnectionHandle;
  try {
    handle = await connectToAgent(
      config.agentCommand,
      config.agentArgs,
      config.cwd,
      appState,
    );
    appState.setConnected(handle.sessionId, handle.agentName);

    handle.agent.proc.on('exit', (code, signal) => {
      if (appState.isConnected) {
        const reason = signal ? `Agent killed by ${signal}` : `Agent exited with code ${code}`;
        log.error(reason);
        appState.isConnected = false;
        appState.handleError(reason);
      }
    });

    log.info('Connected to agent successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Failed to connect to agent: ${message}`);
    closeLogFile();
    process.stderr.write(`\nError: Failed to connect to agent "${config.agentCommand}"\n`);
    process.stderr.write(`  ${message}\n\n`);
    process.stderr.write('Make sure the agent is installed and supports the ACP protocol.\n');
    process.stderr.write('Examples:\n');
    process.stderr.write('  flitter-amp --agent "claude --agent"\n');
    process.stderr.write('  flitter-amp --agent "gemini --experimental-acp"\n');
    process.exit(1);
  }

  // Handle process cleanup
  const cleanup = () => {
    handle.client.cleanup();
    handle.agent.kill();
    closeLogFile();
  };
  process.on('SIGINT', () => {
    log.info('Received SIGINT, shutting down...');
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  // Prompt submission handler — sends text to agent via ACP
  const handleSubmit = async (text: string): Promise<void> => {
    log.info(`handleSubmit called: "${text}", sessionId: ${handle.sessionId}`);
    if (!handle.sessionId) return;
    appState.startProcessing(text);
    try {
      const result = await sendPrompt(handle.connection, handle.sessionId, text);
      appState.onPromptComplete(handle.sessionId, result.stopReason);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`Prompt failed: ${message}`);
      appState.handleError(message);
    }
  };

  // Cancel handler — cancels current agent operation
  const handleCancel = async (): Promise<void> => {
    if (!handle.sessionId || !appState.isProcessing) {
      // Not processing — exit
      cleanup();
      process.exit(0);
    }
    try {
      await cancelPrompt(handle.connection, handle.sessionId);
    } catch (err) {
      log.error('Cancel failed:', err);
    }
  };

  // Start the TUI
  log.info('Starting TUI...');
  await startTUI(appState, handleSubmit, handleCancel);
}

main().catch((err) => {
  process.stderr.write(`\nFatal error: ${err.message}\n`);
  process.exit(1);
});
