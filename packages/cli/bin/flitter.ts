#!/usr/bin/env bun
// @flitter/cli - CLI entry point

import { main } from "../src/main.js";

main().catch((err) => {
  process.stderr.write(`Fatal: ${err?.message ?? err}\n`);
  process.exit(2);
});
