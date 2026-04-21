/**
 * look_at — Multimodal file analysis tool
 *
 * Sends a local file (image, PDF, audio, video, or text) to Google Gemini
 * for natural-language analysis guided by an objective and context.
 *
 * 逆向: amp-cli-reversed/chunk-005.js:148520-148598 (kVR tool spec)
 *   - name: "look_at" (PET constant, chunk-005.js:13214)
 *   - params: path (required), objective (required), context (required), referenceFiles (optional)
 *
 * 逆向: amp-cli-reversed/chunk-005.js:21875-21987 (mVR execution fn)
 *   - reads file, detects MIME, base64-encodes or text-wraps
 *   - calls gemini-3-flash-preview generateContent with system instruction
 *   - reference files are processed same way, failures non-fatal
 *
 * 逆向: amp-cli-reversed/chunk-005.js:21845-21874 (pVR system prompt)
 *   - "You are an AI assistant that analyzes files for a software engineer."
 *   - directives: concise, no preamble, structured comparison, GFM output
 *
 * 逆向: amp-cli-reversed/modules/0046_unknown_vVR.js (MIME detection + text truncation)
 *   - uVR: video MIME set, yVR: audio MIME set
 *   - text truncated at 100,000 chars with "[Truncated]"
 *   - inlineData for images/pdf/audio/video, text fallback otherwise
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExecutionProfile, ToolContext, ToolResult, ToolSpec } from "../types";

// ─── Constants ──────────────────────────────────────────

/** Gemini model for look_at analysis (逆向: AVR = "gemini-3-flash-preview") */
const LOOK_AT_MODEL = "gemini-2.0-flash";

/** Maximum text content length before truncation (逆向: 100,000 chars) */
const MAX_TEXT_LENGTH = 100_000;

/** Maximum output tokens (逆向: maxOutputTokens: 65535) */
const MAX_OUTPUT_TOKENS = 65_535;

/**
 * System prompt for look_at analysis.
 * 逆向: pVR (chunk-005.js:21845-21874)
 */
const LOOK_AT_SYSTEM_PROMPT = `You are an AI assistant that analyzes files for a software engineer.

Guidelines:
- Be concise and precise in your analysis
- Do not include preamble or pleasantries
- For images: describe what you see accurately, noting any text, UI elements, diagrams, or code
- For code files: analyze structure, patterns, and any issues relevant to the objective
- For documents/PDFs: extract key information related to the objective
- When reference files are provided: compare and contrast them with the primary file
- Use GitHub-flavored Markdown for formatting
- Focus your analysis on the stated objective`;

// ─── MIME Detection ─────────────────────────────────────

/**
 * Supported inline data MIME types.
 * 逆向: JuT function checks image/*, uVR (video set), yVR (audio set), application/pdf
 */
const INLINE_DATA_MIMES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
  // PDF
  "application/pdf",
  // Video (逆向: uVR set)
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/webm",
  "video/wmv",
  "video/3gpp",
  // Audio (逆向: yVR set)
  "audio/aac",
  "audio/flac",
  "audio/mp3",
  "audio/m4a",
  "audio/mpeg",
  "audio/mpga",
  "audio/mp4",
  "audio/opus",
  "audio/pcm",
  "audio/wav",
  "audio/webm",
]);

/** Extension → MIME mapping for common file types */
const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mov": "video/mov",
  ".avi": "video/avi",
  ".flv": "video/x-flv",
  ".webm": "video/webm",
  ".wmv": "video/wmv",
  ".3gp": "video/3gpp",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".mp3": "audio/mp3",
  ".m4a": "audio/m4a",
  ".opus": "audio/opus",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

/**
 * Detect MIME type from file extension.
 * 逆向: QuT does magic-byte detection via rFT; falls back to text/plain.
 * We use extension-based detection as a simpler approach.
 */
function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? "text/plain";
}

/**
 * Check if a MIME type should be sent as inline binary data.
 * 逆向: JuT function in modules/0046_unknown_vVR.js
 */
function isInlineDataMime(mimeType: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return INLINE_DATA_MIMES.has(mimeType);
}

// ─── File Processing ────────────────────────────────────

interface ContentPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/**
 * Process a file into Gemini content parts.
 * 逆向: mVR lines 21906-21918 (primary file) and 21919-21935 (reference files)
 *
 * Binary/media files → inlineData with base64
 * Text files → text part, truncated at MAX_TEXT_LENGTH
 */
function processFile(filePath: string, label: string): ContentPart {
  const buffer = fs.readFileSync(filePath);
  const mimeType = detectMimeType(filePath);

  if (isInlineDataMime(mimeType)) {
    return {
      inlineData: {
        mimeType,
        data: buffer.toString("base64"),
      },
    };
  }

  // Text fallback (逆向: ZuT wraps in fenced code block, truncated at 100k chars)
  let text = buffer.toString("utf-8");
  const fileName = path.basename(filePath);
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + "\n[Truncated]";
  }
  return {
    text: `\`\`\`${label}: ${fileName}\n${text}\n\`\`\``,
  };
}

// ─── Gemini API Call ────────────────────────────────────

/**
 * Options for creating the look_at tool.
 * The Gemini API key can be provided directly or resolved from settings.
 */
export interface LookAtToolOptions {
  /** Google API key for Gemini. If not provided, uses GOOGLE_API_KEY env var. */
  apiKey?: string;
  /** Override model name (defaults to gemini-2.0-flash) */
  model?: string;
}

/**
 * Create the look_at tool.
 *
 * 逆向: kVR tool spec (chunk-005.js:148520-148598)
 */
export function createLookAtTool(options: LookAtToolOptions = {}): ToolSpec {
  const model = options.model ?? LOOK_AT_MODEL;

  return {
    name: "look_at",
    source: "builtin",
    isReadOnly: true,

    // 逆向: kVR description (chunk-005.js:148527-148542)
    description: `Analyze a file using multimodal AI (Google Gemini).

Supports images, PDFs, audio, video, and text files. Use this tool when you need to:
- Understand the content of an image, screenshot, or diagram
- Analyze a PDF document
- Review a media file
- Compare files with reference files

The analysis is guided by the objective you provide. Be specific about what you want to learn from the file.

Examples:
- Analyze a screenshot: { "path": "/path/to/screenshot.png", "objective": "Describe the UI layout and any visible errors", "context": "Debugging a frontend issue" }
- Review a PDF: { "path": "/path/to/spec.pdf", "objective": "Extract the API endpoints defined in this spec", "context": "Building an API client" }
- Compare files: { "path": "/path/to/new.png", "objective": "What changed between these versions?", "context": "Reviewing UI changes", "referenceFiles": ["/path/to/old.png"] }`,

    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute path to the file to analyze",
        },
        objective: {
          type: "string",
          description: "What you want to learn from the file — be specific",
        },
        context: {
          type: "string",
          description: "Broader context about what you are trying to achieve",
        },
        referenceFiles: {
          type: "array",
          items: { type: "string" },
          description: "Optional paths to reference files for comparison",
        },
      },
      required: ["path", "objective", "context"],
    },

    executionProfile: {
      resourceKeys: [],
      disableTimeout: true,
    } as ExecutionProfile,

    // 逆向: kVR preprocessArgs expands ~ and resolves relative paths
    preprocessArgs(args: Record<string, unknown>, workingDir?: string): Record<string, unknown> {
      const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
      const result = { ...args };

      // Expand ~ and resolve relative paths for primary file
      if (typeof result.path === "string") {
        let p = result.path as string;
        if (p.startsWith("~/")) p = path.join(home, p.slice(2));
        if (workingDir && !path.isAbsolute(p)) p = path.resolve(workingDir, p);
        result.path = p;
      }

      // Same for referenceFiles
      if (Array.isArray(result.referenceFiles)) {
        result.referenceFiles = (result.referenceFiles as string[]).map((f) => {
          let p = f;
          if (p.startsWith("~/")) p = path.join(home, p.slice(2));
          if (workingDir && !path.isAbsolute(p)) p = path.resolve(workingDir, p);
          return p;
        });
      }

      return result;
    },

    async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
      const filePath = args.path as string | undefined;
      const objective = args.objective as string | undefined;
      const context = args.context as string | undefined;
      const referenceFiles = (args.referenceFiles as string[] | undefined) ?? [];

      // Validate required params
      if (!filePath) return { status: "error", error: 'Missing required parameter "path"' };
      if (!objective) return { status: "error", error: 'Missing required parameter "objective"' };
      if (!context) return { status: "error", error: 'Missing required parameter "context"' };

      // Resolve API key
      const apiKey = options.apiKey ?? process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return {
          status: "error",
          error:
            "No Google API key configured. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.",
        };
      }

      try {
        // Stat the file (逆向: mVR lines 21892-21905)
        let stat: fs.Stats;
        try {
          stat = fs.statSync(filePath);
        } catch {
          return { status: "error", error: `File not found: ${filePath}` };
        }
        if (!stat.isFile()) {
          return { status: "error", error: `Path is not a file: ${filePath}` };
        }

        // Build content parts
        const parts: ContentPart[] = [];

        // Primary file
        parts.push(processFile(filePath, "File"));

        // Reference files (逆向: failures are non-fatal, logged and skipped)
        for (const refPath of referenceFiles) {
          try {
            const refStat = fs.statSync(refPath);
            if (refStat.isFile()) {
              parts.push(processFile(refPath, "Reference"));
            }
          } catch {
            // Non-fatal: skip failed reference files (逆向: J.warn + continue)
          }
        }

        // Append the analysis prompt (逆向: mVR lines 21936-21942)
        parts.push({
          text: `${context}\n\nAnalyze this file with the following objective:\n\n${objective}`,
        });

        // Call Gemini generateContent (逆向: mVR lines 21943-21962)
        const { GoogleGenAI } = await import("@google/genai");
        const client = new GoogleGenAI({ apiKey });

        const response = await client.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction: LOOK_AT_SYSTEM_PROMPT,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 1,
          },
        });

        const responseText = response.text?.trim();
        if (!responseText) {
          return { status: "error", error: "No response from analysis" };
        }

        return { status: "done", content: responseText };
      } catch (err) {
        return {
          status: "error",
          error: `Failed to analyze ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}

// ─── Exports ────────────────────────────────────────────

export const LookAtTool = {
  create: createLookAtTool,
};
