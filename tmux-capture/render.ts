import { Terminal } from "@xterm/headless";
import { SerializeAddon } from "@xterm/addon-serialize";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename, dirname, resolve } from "path";

function parseSize(filename: string): { rows: number; cols: number } | null {
  const match = filename.match(/-(\d+)x(\d+)\.golden$/);
  if (!match) return null;
  return { rows: parseInt(match[1], 10), cols: parseInt(match[2], 10) };
}

async function renderGoldenToHTML(goldenPath: string): Promise<string> {
  const filename = basename(goldenPath);
  const size = parseSize(filename);
  if (!size) {
    throw new Error(`Cannot parse size from filename: ${filename}`);
  }

  const raw = readFileSync(goldenPath, "utf-8");

  const terminal = new Terminal({
    cols: size.cols,
    rows: size.rows,
    allowProposedApi: true,
    convertEol: true,
    theme: {
      background: "#0d1117",
      foreground: "#e6edf3",
      cursor: "#e6edf3",
      black: "#484f58",
      red: "#ff7b72",
      green: "#3fb950",
      yellow: "#d29922",
      blue: "#58a6ff",
      magenta: "#bc8cff",
      cyan: "#39c5cf",
      white: "#b1bac4",
      brightBlack: "#6e7681",
      brightRed: "#ffa198",
      brightGreen: "#56d364",
      brightYellow: "#e3b341",
      brightBlue: "#79c0ff",
      brightMagenta: "#d2a8ff",
      brightCyan: "#56d4dd",
      brightWhite: "#f0f6fc",
    },
  });
  const serializeAddon = new SerializeAddon();
  terminal.loadAddon(serializeAddon);

  await new Promise<void>((resolve) => {
    terminal.write(raw, resolve);
  });

  const html = serializeAddon.serializeAsHTML({
    onlySelection: false,
    includeGlobalBackground: true,
  });

  return html.replace(
    "<pre>",
    "<pre style='display:inline-block;min-width:100%'>"
  );
}

const dir = import.meta.dir;
const targets = process.argv.slice(2);

const goldenFiles =
  targets.length > 0
    ? targets
    : readdirSync(dir)
      .filter((f) => f.endsWith(".golden"))
      .map((f) => join(dir, f));

for (const goldenPath of goldenFiles) {
  const absPath = resolve(goldenPath);
  const filename = basename(absPath);
  const name = filename.replace(/\.golden$/, "");
  const outPath = join(dirname(absPath), `${name}.html`);

  try {
    const html = await renderGoldenToHTML(goldenPath);
    writeFileSync(outPath, html);
    console.log(`Rendered: ${filename} -> ${name}.html`);
  } catch (e) {
    console.error(`Failed: ${filename} - ${(e as Error).message}`);
  }
}
