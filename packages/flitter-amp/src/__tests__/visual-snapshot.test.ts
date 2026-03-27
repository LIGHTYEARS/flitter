/**
 * Visual snapshot tests for flitter-amp.
 *
 * Renders the App widget tree headlessly at different states and produces
 * SVG files in __snapshots__/ that can be opened in any browser to inspect
 * the actual terminal rendering.
 *
 * Run:  bun test src/__tests__/visual-snapshot.test.ts
 * View: open __snapshots__/welcome-120x40.svg in browser
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

import { WidgetsBinding } from 'flitter-core/src/framework/binding';
import { FrameScheduler } from 'flitter-core/src/scheduler/frame-scheduler';

import { captureToSvg } from '../test-utils/capture';
import { App } from '../app';
import { AppState } from '../state/app-state';
import { lightTheme } from '../themes/light';
import { catppuccinMochaTheme } from '../themes/catppuccin-mocha';
import { solarizedDarkTheme } from '../themes/solarized-dark';
import type { AmpBaseTheme } from '../themes/amp-theme-data';
import type { SvgConfig } from '../test-utils/termshot';

const SNAPSHOT_DIR = path.join(__dirname, '__snapshots__');

// Ensure snapshot directory exists
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeSvg(name: string, svg: string): string {
  ensureDir(SNAPSHOT_DIR);
  const filePath = path.join(SNAPSHOT_DIR, `${name}.svg`);
  fs.writeFileSync(filePath, svg, 'utf-8');
  return filePath;
}

function makeApp(appState: AppState): App {
  return new App({
    appState,
    onSubmit: () => {},
    onCancel: () => {},
  });
}

/**
 * Get SvgConfig defaults matching a theme's background/foreground colors.
 */
function themeToSvgConfig(baseTheme: AmpBaseTheme): Partial<SvgConfig> {
  const bgRgb = baseTheme.background.toRgb();
  const fgRgb = baseTheme.foreground.toRgb();
  return {
    defaultBg: `#${hex2(bgRgb.r)}${hex2(bgRgb.g)}${hex2(bgRgb.b)}`,
    defaultFg: `#${hex2(fgRgb.r)}${hex2(fgRgb.g)}${hex2(fgRgb.b)}`,
  };
}

function hex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

describe('Visual Snapshots', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  });

  // ════════════════════════════════════════════════════════════════════
  //  1. Welcome Screen
  // ════════════════════════════════════════════════════════════════════

  describe('Welcome Screen', () => {
    test('120×40 default', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/projects/my-app';
      appState.gitBranch = 'main';
      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120,
        rows: 40,
        title: 'flitter-amp — Welcome (120×40)',
      });

      const filePath = writeSvg('welcome-120x40', svg);
      expect(svg).toContain('<svg');
      expect(svg.length).toBeGreaterThan(500);
      console.log(`  → ${filePath}`);
    });

    test('80×24 compact', () => {
      const appState = new AppState();
      appState.cwd = '~/projects';
      appState.gitBranch = 'feature/auth';
      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 80,
        rows: 24,
        title: 'flitter-amp — Welcome (80×24)',
      });

      const filePath = writeSvg('welcome-80x24', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  2. Conversation Messages
  // ════════════════════════════════════════════════════════════════════

  describe('Conversation', () => {
    test('user + assistant messages with markdown', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/projects/my-app';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Help me refactor the authentication module');

      appState.conversation.appendAssistantChunk(
        "I'll help you refactor the authentication module. Let me start by examining the current implementation.\n\n" +
        "Here's what I found:\n" +
        "- `src/auth/login.ts` — handles login flow\n" +
        "- `src/auth/session.ts` — session management\n" +
        "- `src/auth/middleware.ts` — Express middleware\n\n" +
        "The main issues I see are:\n" +
        "1. **Tight coupling** between session and login\n" +
        "2. No **token refresh** mechanism\n" +
        "3. Missing **rate limiting** on login endpoint",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120,
        rows: 40,
        title: 'flitter-amp — Conversation',
      });

      const filePath = writeSvg('conversation-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('streaming response (in-progress)', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/projects/my-app';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Explain how the build system works');
      appState.conversation.isProcessing = true;
      appState.conversation.appendAssistantChunk(
        "The build system uses esbuild with a custom plugin for...",
      );
      // Don't finalize — it's still streaming

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120,
        rows: 40,
        title: 'flitter-amp — Streaming Response',
      });

      const filePath = writeSvg('streaming-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('80×24 compact with conversation', () => {
      const appState = new AppState();
      appState.cwd = '~/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('What does this function do?');
      appState.conversation.appendAssistantChunk(
        "This function **validates** user input and returns a sanitized result. " +
        "It performs:\n" +
        "1. Input trimming\n" +
        "2. XSS prevention\n" +
        "3. Length validation",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 80,
        rows: 24,
        title: 'flitter-amp — Compact Conversation (80×24)',
      });

      const filePath = writeSvg('conversation-80x24', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('wide terminal 200×50', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/workspace/monorepo/packages/my-library';
      appState.gitBranch = 'develop';

      appState.conversation.addUserMessage('Show me the project structure');
      appState.conversation.appendAssistantChunk(
        "Here's the project structure:\n\n" +
        "```\n" +
        "├── packages/\n" +
        "│   ├── core/          # Core library\n" +
        "│   ├── cli/           # CLI tool\n" +
        "│   └── web/           # Web interface\n" +
        "├── scripts/\n" +
        "│   └── build.ts\n" +
        "├── package.json\n" +
        "└── tsconfig.json\n" +
        "```",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 200,
        rows: 50,
        title: 'flitter-amp — Wide Terminal (200×50)',
      });

      const filePath = writeSvg('wide-200x50', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  3. Thinking Blocks
  // ════════════════════════════════════════════════════════════════════

  describe('Thinking Blocks', () => {
    test('expanded thinking with content', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Analyze this code for security issues');

      // Add thinking block then expand it
      appState.conversation.appendThinkingChunk(
        "Let me analyze this code for potential security vulnerabilities. " +
        "I need to look for common issues like SQL injection, XSS, command injection, " +
        "and insecure deserialization. The code uses Express.js with a PostgreSQL " +
        "database, so I should focus on parameterized queries and input validation.",
      );
      appState.conversation.finalizeThinking();
      const thinkingItem = appState.conversation.items.find(i => i.type === 'thinking');
      if (thinkingItem && thinkingItem.type === 'thinking') {
        thinkingItem.collapsed = false;
      }

      appState.conversation.appendAssistantChunk(
        "I found **3 security issues** in your code:\n\n" +
        "1. **SQL Injection** in `getUserById()` — use parameterized queries\n" +
        "2. **XSS** in template rendering — escape user input\n" +
        "3. **Missing CSRF** tokens on POST endpoints",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120,
        rows: 40,
        title: 'flitter-amp — Thinking (Expanded)',
      });

      const filePath = writeSvg('thinking-expanded-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('collapsed thinking block', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Fix the bug');

      appState.conversation.appendThinkingChunk(
        "I need to understand what bug the user is referring to...",
      );
      appState.conversation.finalizeThinking();
      // Default: collapsed = true

      appState.conversation.appendAssistantChunk("I've identified the bug and fixed it.");
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120,
        rows: 40,
        title: 'flitter-amp — Thinking (Collapsed)',
      });

      const filePath = writeSvg('thinking-collapsed-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('streaming thinking (in-progress)', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Design a new architecture');
      appState.conversation.isProcessing = true;

      appState.conversation.appendThinkingChunk(
        "Let me think about the best architecture for this...",
      );
      // Don't finalize — still streaming; expand to see content
      const thinkingItem = appState.conversation.items.find(i => i.type === 'thinking');
      if (thinkingItem && thinkingItem.type === 'thinking') {
        thinkingItem.collapsed = false;
      }

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120,
        rows: 40,
        title: 'flitter-amp — Thinking (Streaming)',
      });

      const filePath = writeSvg('thinking-streaming-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('interrupted thinking', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Help me with this');

      // Empty thinking = interrupted
      appState.conversation.items.push({
        type: 'thinking',
        text: '',
        timestamp: Date.now(),
        isStreaming: false,
        collapsed: false,
      });

      appState.conversation.appendAssistantChunk("Here's what I can help with.");
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120,
        rows: 40,
        title: 'flitter-amp — Thinking (Interrupted)',
      });

      const filePath = writeSvg('thinking-interrupted-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  4. Tool Calls
  // ════════════════════════════════════════════════════════════════════

  describe('Tool Calls', () => {
    test('multiple tool call statuses', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/projects/my-app';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Read the auth module');

      appState.conversation.addToolCall(
        'tc-001', 'Read src/auth/login.ts', 'Read', 'completed',
        [{ path: 'src/auth/login.ts' }],
      );

      appState.conversation.addToolCall(
        'tc-002', 'Read src/auth/session.ts', 'Read', 'in_progress',
        [{ path: 'src/auth/session.ts' }],
      );

      appState.conversation.appendAssistantChunk(
        "I've read the authentication files. The login module uses JWT tokens with a 24-hour expiration.",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Tool Calls',
      });

      const filePath = writeSvg('tool-calls-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('Read tool', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Show me the config file');

      appState.conversation.addToolCall(
        'tc-read-1', 'Read tsconfig.json', 'Read', 'completed',
        [{ path: 'tsconfig.json' }],
      );

      appState.conversation.appendAssistantChunk(
        "The TypeScript config uses `strict: true` with ESM module resolution.",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Read Tool',
      });

      const filePath = writeSvg('tool-read-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('Bash tool with command', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Run the tests');

      appState.conversation.addToolCall(
        'tc-bash-1', '$ npm test', 'Bash', 'completed',
        [], { command: 'npm test' },
      );

      appState.conversation.appendAssistantChunk(
        "All **42 tests** passed successfully.\n\n" +
        "```\nTest Suites: 8 passed, 8 total\nTests: 42 passed, 42 total\nTime: 3.2s\n```",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Bash Tool',
      });

      const filePath = writeSvg('tool-bash-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('Grep tool with search', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Find all TODO comments');

      appState.conversation.addToolCall(
        'tc-grep-1', 'Search for TODO', 'Grep', 'completed',
        [], { pattern: 'TODO', path: 'src/' },
      );

      appState.conversation.appendAssistantChunk(
        "Found **7 TODO** comments across the codebase:\n\n" +
        "- `src/auth/login.ts:42` — TODO: Add rate limiting\n" +
        "- `src/api/routes.ts:88` — TODO: Validate input\n" +
        "- `src/db/queries.ts:15` — TODO: Use connection pool",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Grep Tool',
      });

      const filePath = writeSvg('tool-grep-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('edit_file tool', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Add input validation');

      appState.conversation.addToolCall(
        'tc-edit-1', 'Edit src/api/routes.ts', 'edit_file', 'completed',
        [{ path: 'src/api/routes.ts' }],
      );

      appState.conversation.appendAssistantChunk(
        "Added input validation to the `/api/users` endpoint with:\n" +
        "- Email format check\n" +
        "- Password strength validation\n" +
        "- XSS sanitization",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Edit File Tool',
      });

      const filePath = writeSvg('tool-edit-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('TodoList tool', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Plan the refactoring');

      appState.conversation.addToolCall(
        'tc-todo-1', 'Write todo list', 'todo_write', 'completed',
        [], {
          todos: [
            { content: 'Extract auth middleware', status: 'completed' },
            { content: 'Add token refresh logic', status: 'in_progress' },
            { content: 'Update API routes', status: 'pending' },
            { content: 'Write integration tests', status: 'pending' },
          ],
        },
      );

      appState.conversation.appendAssistantChunk(
        "I've created a todo list to track the refactoring progress.",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — TodoList Tool',
      });

      const filePath = writeSvg('tool-todolist-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('failed tool call', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Run the deploy script');

      appState.conversation.addToolCall(
        'tc-fail-1', '$ ./deploy.sh', 'Bash', 'failed',
        [], { command: './deploy.sh' },
      );

      appState.conversation.appendAssistantChunk(
        "The deploy script **failed** with exit code 1. " +
        "The error indicates a missing environment variable `DATABASE_URL`.",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Failed Tool Call',
      });

      const filePath = writeSvg('tool-failed-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  5. Plan View
  // ════════════════════════════════════════════════════════════════════

  describe('Plan View', () => {
    test('plan with mixed statuses', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Refactor the authentication system');

      appState.conversation.setPlan([
        { content: 'Analyze current auth architecture', priority: 'high', status: 'completed' },
        { content: 'Extract JWT token handling', priority: 'high', status: 'completed' },
        { content: 'Implement token refresh flow', priority: 'high', status: 'in_progress' },
        { content: 'Update middleware chain', priority: 'medium', status: 'pending' },
        { content: 'Add rate limiting', priority: 'medium', status: 'pending' },
        { content: 'Write integration tests', priority: 'low', status: 'pending' },
      ]);

      appState.conversation.appendAssistantChunk(
        "I'm working through the plan. Steps 1-2 are complete, and I'm currently " +
        "implementing the token refresh flow.",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Plan View',
      });

      const filePath = writeSvg('plan-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  6. Error State
  // ════════════════════════════════════════════════════════════════════

  describe('Error State', () => {
    test('error message display', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';
      appState.error = 'Connection refused: agent process exited unexpectedly (code 1)';

      appState.conversation.addUserMessage('Help me fix the build');
      appState.conversation.appendAssistantChunk(
        "I was looking at the build configuration when the connection was lost.",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Error State',
      });

      const filePath = writeSvg('error-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  7. Processing State with Token Usage
  // ════════════════════════════════════════════════════════════════════

  describe('Processing State', () => {
    test('token usage display during processing', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'feature/new-api';
      appState.conversation.isProcessing = true;
      appState.conversation.setUsage({
        size: 128000,
        used: 24500,
      });

      appState.conversation.addUserMessage('Implement the new API endpoints');
      appState.conversation.appendAssistantChunk(
        "I'll implement the new API endpoints. Let me start by reading the existing route definitions...",
      );
      // Don't finalize — still streaming

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Processing with Token Usage',
      });

      const filePath = writeSvg('processing-tokens-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  8. Markdown Rich Content
  // ════════════════════════════════════════════════════════════════════

  describe('Markdown Rich Content', () => {
    test('code blocks, tables, nested lists', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Explain the API response format');

      appState.conversation.appendAssistantChunk(
        "## API Response Format\n\n" +
        "All endpoints return a **standardized** JSON response:\n\n" +
        "```typescript\n" +
        "interface ApiResponse<T> {\n" +
        "  success: boolean;\n" +
        "  data?: T;\n" +
        "  error?: {\n" +
        "    code: string;\n" +
        "    message: string;\n" +
        "  };\n" +
        "}\n" +
        "```\n\n" +
        "### Status Codes\n\n" +
        "| Code | Meaning | Use case |\n" +
        "|------|---------|----------|\n" +
        "| 200  | OK      | Successful GET/PUT |\n" +
        "| 201  | Created | Successful POST |\n" +
        "| 400  | Bad Request | Validation error |\n" +
        "| 401  | Unauthorized | Missing auth |\n" +
        "| 500  | Server Error | Internal error |\n\n" +
        "### Error Handling\n\n" +
        "Nested error categories:\n" +
        "- **Client errors** (4xx)\n" +
        "  - Validation failures\n" +
        "  - Authentication issues\n" +
        "  - Rate limiting\n" +
        "- **Server errors** (5xx)\n" +
        "  - Database timeouts\n" +
        "  - External service failures",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 50,
        title: 'flitter-amp — Markdown Rich Content',
      });

      const filePath = writeSvg('markdown-rich-120x50', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  9. Complex Multi-Turn Conversation
  // ════════════════════════════════════════════════════════════════════

  describe('Complex Conversation', () => {
    test('multi-turn with thinking + tools + response', () => {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      // Turn 1: User asks
      appState.conversation.addUserMessage('Fix the login bug users are reporting');

      // Thinking
      appState.conversation.appendThinkingChunk(
        "I need to investigate the login bug. Let me read the relevant files first.",
      );
      appState.conversation.finalizeThinking();

      // Tool calls
      appState.conversation.addToolCall(
        'tc-multi-1', 'Read src/auth/login.ts', 'Read', 'completed',
        [{ path: 'src/auth/login.ts' }],
      );

      appState.conversation.addToolCall(
        'tc-multi-2', '$ grep -rn "login" src/auth/', 'Bash', 'completed',
        [], { command: 'grep -rn "login" src/auth/' },
      );

      // Response
      appState.conversation.appendAssistantChunk(
        "Found the bug! The login handler **doesn't await** the session creation, " +
        "causing a race condition. Fixing it now.",
      );
      appState.conversation.finalizeAssistantMessage();

      // Edit
      appState.conversation.addToolCall(
        'tc-multi-3', 'Edit src/auth/login.ts', 'edit_file', 'completed',
        [{ path: 'src/auth/login.ts' }],
      );

      // Verification
      appState.conversation.addToolCall(
        'tc-multi-4', '$ npm test -- --grep "login"', 'Bash', 'completed',
        [], { command: 'npm test -- --grep "login"' },
      );

      appState.conversation.appendAssistantChunk(
        "The fix is in place and all login tests pass. " +
        "The issue was a missing `await` on `createSession()`.",
      );
      appState.conversation.finalizeAssistantMessage();

      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 50,
        title: 'flitter-amp — Complex Multi-Turn',
      });

      const filePath = writeSvg('complex-multiturn-120x50', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  10. Theme Variants
  // ════════════════════════════════════════════════════════════════════

  describe('Theme Variants', () => {
    function buildThemedConversation(): AppState {
      const appState = new AppState();
      appState.cwd = '/home/user/project';
      appState.gitBranch = 'main';

      appState.conversation.addUserMessage('Explain this code');

      appState.conversation.appendThinkingChunk('Analyzing the code structure...');
      appState.conversation.finalizeThinking();

      appState.conversation.addToolCall(
        'tc-theme-1', 'Read src/main.ts', 'Read', 'completed',
        [{ path: 'src/main.ts' }],
      );

      appState.conversation.appendAssistantChunk(
        "This code implements a **REST API** with the following endpoints:\n\n" +
        "- `GET /api/users` — List all users\n" +
        "- `POST /api/users` — Create a user\n" +
        "- `DELETE /api/users/:id` — Delete a user\n\n" +
        "```typescript\napp.get('/api/users', async (req, res) => {\n  const users = await db.query('SELECT * FROM users');\n  res.json({ success: true, data: users });\n});\n```",
      );
      appState.conversation.finalizeAssistantMessage();

      return appState;
    }

    test('light theme', () => {
      const appState = buildThemedConversation();
      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Light Theme',
        ...themeToSvgConfig(lightTheme),
      });

      const filePath = writeSvg('theme-light-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('catppuccin-mocha theme', () => {
      const appState = buildThemedConversation();
      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Catppuccin Mocha Theme',
        ...themeToSvgConfig(catppuccinMochaTheme),
      });

      const filePath = writeSvg('theme-catppuccin-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });

    test('solarized-dark theme', () => {
      const appState = buildThemedConversation();
      const app = makeApp(appState);

      const svg = captureToSvg(app, {
        cols: 120, rows: 40,
        title: 'flitter-amp — Solarized Dark Theme',
        ...themeToSvgConfig(solarizedDarkTheme),
      });

      const filePath = writeSvg('theme-solarized-120x40', svg);
      expect(svg).toContain('<svg');
      console.log(`  → ${filePath}`);
    });
  });
});
