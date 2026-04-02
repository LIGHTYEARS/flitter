#!/usr/bin/env bun

import { chdir } from 'node:process';

import { getUserConfigPath, parseArgs } from './state/config';
import { closeLogFile, getCurrentLogPath, initLogFile, log, setLogLevel } from './utils/logger';
import { startBootstrapShell } from './bootstrap-shell';

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

  const binding = await startBootstrapShell({
    cwd: config.cwd,
    configPath: getUserConfigPath(),
    logPath: getCurrentLogPath(),
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
