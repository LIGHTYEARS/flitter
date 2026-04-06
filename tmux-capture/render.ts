import { readdirSync, statSync } from "fs";
import { join, basename, dirname, resolve } from "path";

function parseSize(filename: string): { rows: number; cols: number } | null {
  const match = filename.match(/-(\d+)x(\d+)\.golden$/);
  if (!match) return null;
  return { rows: parseInt(match[1], 10), cols: parseInt(match[2], 10) };
}

function findGoldenFiles(baseDir: string): string[] {
  const results: string[] = [];
  const screensDir = join(baseDir, "screens");
  try {
    for (const screen of readdirSync(screensDir)) {
      const screenDir = join(screensDir, screen);
      if (!statSync(screenDir).isDirectory()) continue;
      for (const file of readdirSync(screenDir)) {
        if (file.startsWith("ansi-") && file.endsWith(".golden")) {
          results.push(join(screenDir, file));
        }
      }
    }
  } catch { }
  return results;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function exec(args: string[], retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    if (code === 0) return stdout.trim();
    if (attempt < retries - 1) {
      await sleep(1000);
      continue;
    }
    throw new Error(`Command failed (${code}): ${args.join(" ")}\n${stderr}`);
  }
  return "";
}

const dir = import.meta.dir;
const targets = process.argv.slice(2);
const goldenFiles =
  targets.length > 0 ? targets.map((t) => resolve(t)) : findGoldenFiles(dir);

if (goldenFiles.length === 0) {
  console.error("No golden files found.");
  process.exit(1);
}

const PORT = 18765;

const vite = Bun.spawn(["npx", "vite", "--port", String(PORT)], {
  cwd: dir,
  stdout: "pipe",
  stderr: "pipe",
});

await sleep(5000);
console.log(`Vite dev server started on http://localhost:${PORT}`);

try {
  for (const goldenPath of goldenFiles) {
    const absPath = resolve(goldenPath);
    const filename = basename(absPath);
    const size = parseSize(filename);
    if (!size) {
      console.error(`Cannot parse size from filename: ${filename}`);
      continue;
    }

    const relativePath = absPath.replace(dir, "").replace(/^\//, "");
    const screenshotName = `screenshot-${size.rows}x${size.cols}.png`;
    const screenshotPath = join(dirname(absPath), screenshotName);

    const viewerUrl = `http://localhost:${PORT}/viewer.html?file=${encodeURIComponent("/" + relativePath)}&cols=${size.cols}&rows=${size.rows}`;

    console.log(`Rendering: ${relativePath}`);

    await exec(["agent-browser", "open", viewerUrl]);
    await exec([
      "agent-browser",
      "wait",
      "--fn",
      "window.__XTERM_READY === true",
    ]);
    await exec(["agent-browser", "screenshot", "--full", screenshotPath]);

    console.log(`  -> ${screenshotName}`);
  }
} finally {
  try {
    await exec(["agent-browser", "close"]);
  } catch { }
  vite.kill();
  console.log("Done.");
}
