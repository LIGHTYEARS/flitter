#!/usr/bin/env bun

import { chdir } from 'node:process';

import { getUserConfigPath, parseArgs } from './state/config';
import { closeLogFile, getCurrentLogPath, initLogFile, log, setLogLevel } from './utils/logger';
import { startBootstrapShell } from './bootstrap-shell';
import { AnthropicProvider } from './provider/anthropic';
import { AppState } from './state/app-state';

/** Main entry point — parses config, creates provider and app state, starts TUI. */
async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  setLogLevel(config.logLevel);
  initLogFile(config.logRetentionDays);

  try {
    chdir(config.cwd);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: failed to enter cwd ${config.cwd}\n${message}\n`);
    process.exit(1);
  }

  log.info(`flitter-cli starting in ${config.cwd}`);

  // Create provider — requires API key
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

  // Create top-level application state
  const appState = AppState.create({ cwd: config.cwd, provider });

  const binding = await startBootstrapShell({
    cwd: config.cwd,
    configPath: getUserConfigPath(),
    logPath: getCurrentLogPath(),
    appState,
  });

  await binding.waitForExit();
  closeLogFile();
}

main().catch((error) => {
  closeLogFile();
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`\nFatal error: ${message}\n`);
  process.exit(1);
});
