/**
 * tmux-harness — standalone TUI launcher for tmux integration tests.
 *
 * Launches the real flitter-amp TUI in a terminal without requiring an agent
 * connection. Pre-populates AppState based on the selected scenario.
 *
 * Usage:
 *   bun run src/test-utils/tmux-harness.ts --scenario <name>
 *
 * Scenarios:
 *   welcome      — empty conversation with cwd + gitBranch
 *   conversation — user + assistant messages
 *   tools        — completed + in_progress tool calls
 *   error        — error message displayed
 *   thinking     — expanded thinking block
 */

import { AppState } from '../state/app-state';
import { startTUI } from '../app';

type Scenario = 'welcome' | 'conversation' | 'tools' | 'error' | 'thinking';

function buildAppState(scenario: Scenario): AppState {
  const appState = new AppState();
  appState.cwd = '/home/user/project';
  appState.gitBranch = 'main';

  switch (scenario) {
    case 'welcome':
      // Empty conversation — shows welcome screen
      break;

    case 'conversation':
      appState.conversation.addUserMessage('What does this project do?');
      appState.conversation.appendAssistantChunk(
        'This is a TUI application built with flitter-core. It provides a terminal-based interface for interacting with AI agents.',
      );
      appState.conversation.finalizeAssistantMessage();
      break;

    case 'tools':
      appState.conversation.addUserMessage('Read the config and run tests');
      appState.conversation.addToolCall(
        'tc-1', 'Read config.json', 'Read', 'completed',
        [{ path: 'config.json' }],
        { file_path: 'config.json' },
      );
      appState.conversation.addToolCall(
        'tc-2', '$ npm test', 'Bash', 'in_progress',
        [], { command: 'npm test' },
      );
      break;

    case 'error':
      appState.conversation.addUserMessage('deploy');
      appState.conversation.appendAssistantChunk('Attempting deployment...');
      appState.conversation.finalizeAssistantMessage();
      appState.error = 'Connection refused: agent exited (code 1)';
      break;

    case 'thinking':
      appState.conversation.addUserMessage('Analyze the architecture');
      appState.conversation.appendThinkingChunk(
        'Let me analyze the project structure. The codebase uses a widget tree pattern ' +
        'similar to Flutter, with a terminal rendering backend.',
      );
      appState.conversation.finalizeThinking();
      // Expand the thinking block
      const thinkingIndex = appState.conversation.items.findIndex(i => i.type === 'thinking');
      if (thinkingIndex >= 0) {
        appState.conversation.setItemCollapsed(thinkingIndex, false);
      }
      appState.conversation.appendAssistantChunk(
        'The project follows a layered architecture with core rendering, widgets, and application layers.',
      );
      appState.conversation.finalizeAssistantMessage();
      break;
  }

  return appState;
}

// --- Main ---

const args = process.argv.slice(2);
const scenarioIdx = args.indexOf('--scenario');
const scenario = (scenarioIdx >= 0 ? args[scenarioIdx + 1] : 'welcome') as Scenario;

const validScenarios: Scenario[] = ['welcome', 'conversation', 'tools', 'error', 'thinking'];
if (!validScenarios.includes(scenario)) {
  process.stderr.write(
    `Unknown scenario: "${scenario}"\nValid: ${validScenarios.join(', ')}\n`,
  );
  process.exit(1);
}

const appState = buildAppState(scenario);

startTUI(appState, () => {}, () => {}).catch((err) => {
  process.stderr.write(`Failed to start TUI: ${err}\n`);
  process.exit(1);
});
