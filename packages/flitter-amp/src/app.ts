// Root App widget — the top-level widget tree matching Amp's layout
//
// Layout (Amp-faithful, Phase 7):
// Column (mainAxisSize: max)
//   ├── Expanded
//   │   └── Row (crossAxisAlignment: stretch)
//   │       ├── Expanded
//   │       │   └── SingleChildScrollView (position: bottom, followMode)
//   │       │       └── ChatView (conversation items)
//   │       └── Scrollbar (1-col wide)
//   ├── InputArea (full-width, top separator, mode label)
//   └── StatusBar (? for shortcuts + cwd + git branch)
//
// Overlays (Stack-based, priority order):
//   1. PermissionDialog — agent permission request (modal)
//   2. CommandPalette — Ctrl+O action palette
//
// Mouse: enabled automatically by flitter-core MouseManager (terminal: true)
// ScrollView responds to mouse wheel; SelectionList supports enableMouseInteraction

import {
  StatefulWidget, State, Widget,
} from 'flitter-core/src/framework/widget';
import { runApp, WidgetsBinding } from 'flitter-core/src/framework/binding';
import { Column, Row } from 'flitter-core/src/widgets/flex';
import { Expanded } from 'flitter-core/src/widgets/flexible';
import { SingleChildScrollView } from 'flitter-core/src/widgets/scroll-view';
import { ScrollController } from 'flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from 'flitter-core/src/widgets/scrollbar';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { Color } from 'flitter-core/src/core/color';
import { FocusScope } from 'flitter-core/src/widgets/focus-scope';
import { Center } from 'flitter-core/src/widgets/center';
import { Stack, Positioned } from 'flitter-core/src/widgets/stack';
import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';

import { AppState } from './state/app-state';
import { PromptHistory } from './state/history';
import { ChatView } from './widgets/chat-view';
import { BottomGrid } from './widgets/bottom-grid';
import { PermissionDialog } from './widgets/permission-dialog';
import { CommandPalette } from './widgets/command-palette';
import { FilePicker } from './widgets/file-picker';
import { AmpThemeProvider, createAmpTheme, darkTheme as darkBaseTheme } from './themes/index';
import { log } from './utils/logger';

// --- App Widget ---

interface AppProps {
  appState: AppState;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export class App extends StatefulWidget {
  readonly appState: AppState;
  readonly onSubmit: (text: string) => void;
  readonly onCancel: () => void;

  constructor(props: AppProps) {
    super({});
    this.appState = props.appState;
    this.onSubmit = props.onSubmit;
    this.onCancel = props.onCancel;
  }

  createState(): AppStateWidget {
    return new AppStateWidget();
  }
}

class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private stateListener: (() => void) | null = null;
  private showCommandPalette = false;
  private showFilePicker = false;
  private fileList: string[] = [];
  private promptHistory = new PromptHistory();

  override initState(): void {
    super.initState();
    // Listen to AppState changes and trigger rebuilds
    this.stateListener = () => {
      const wasAtBottom = this.scrollController.atBottom;
      this.setState(() => {});
      // Only re-enable follow mode if user was already at bottom
      if (this.widget.appState.isProcessing && wasAtBottom) {
        this.scrollController.enableFollowMode();
      }
    };
    this.widget.appState.addListener(this.stateListener);
  }

  override dispose(): void {
    if (this.stateListener) {
      this.widget.appState.removeListener(this.stateListener);
    }
    super.dispose();
  }

  private toggleThinking(appState: AppState): void {
    for (const item of appState.conversation.items) {
      if (item.type === 'thinking') {
        item.collapsed = !item.collapsed;
      }
    }
  }

  build(): Widget {
    const appState = this.widget.appState;
    const items = appState.conversation.items;
    console.error(`[APP-DEBUG] build: items.length=${items.length}, isProcessing=${appState.isProcessing}`);

    // Amp ref: scrollbarThumb = foreground (gH.default()), scrollbarTrack = index(8)
    const scrollThumbColor = Color.defaultColor;
    const scrollTrackColor = Color.ansi256(8);

    const mainContent = new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        // Escape — dismiss overlays (priority: command palette > permission dialog)
        if (event.key === 'Escape') {
          if (this.showFilePicker) {
            this.setState(() => { this.showFilePicker = false; });
            return 'handled';
          }
          if (this.showCommandPalette) {
            this.setState(() => { this.showCommandPalette = false; });
            return 'handled';
          }
          if (appState.hasPendingPermission) {
            appState.resolvePermission(null);
            return 'handled';
          }
          return 'ignored';
        }

        // Ctrl+O — open command palette
        if (event.ctrlKey && event.key === 'o') {
          this.setState(() => { this.showCommandPalette = true; });
          return 'handled';
        }

        // Ctrl+C — cancel current operation
        if (event.ctrlKey && event.key === 'c') {
          this.widget.onCancel();
          return 'handled';
        }

        // Ctrl+L — clear conversation
        if (event.ctrlKey && event.key === 'l') {
          appState.conversation.clear();
          this.setState(() => {});
          return 'handled';
        }

        // Alt+T — toggle tool call expansion
        if (event.altKey && event.key === 't') {
          appState.conversation.toggleToolCalls();
          this.setState(() => {});
          return 'handled';
        }

        // Ctrl+G — open prompt in $EDITOR
        // TODO: Full TUI suspend requires WidgetsBinding.suspend()/resume()
        // When available: suspend TUI, spawn editor, resume with edited text
        if (event.ctrlKey && event.key === 'g') {
          return 'handled';
        }

        // Ctrl+R — navigate prompt history (backward)
        if (event.ctrlKey && event.key === 'r') {
          const prev = this.promptHistory.previous();
          if (prev !== null) {
            // TODO: inject text into InputArea when TextEditingController is exposed
            this.setState(() => {});
          }
          return 'handled';
        }

        return 'ignored';
      },
      child: new Column({
        mainAxisSize: 'max',
        crossAxisAlignment: 'stretch',
        children: [
          // Main content: scrollable chat + scrollbar (Amp: Row with Expanded + Scrollbar)
          // BUG-1 FIX: When no items, bypass ScrollView and use Center so
          // the welcome screen can actually center vertically (ScrollView
          // gives unbounded height → Column mainAxisAlignment:'center' has no effect).
          new Expanded({
            child: items.length === 0
              ? new Center({
                  child: new Padding({
                    padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
                    child: new ChatView({
                      items,
                      error: appState.error,
                    }),
                  }),
                })
              : new Row({
                  crossAxisAlignment: 'stretch',
                  children: [
                    new Expanded({
                      child: new SingleChildScrollView({
                        controller: this.scrollController,
                        position: 'bottom',
                        enableKeyboardScroll: true,
                        // Amp ref: a$({padding: H$.only({left: 2, right: 2-3, bottom: 1})})
                        child: new Padding({
                          padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
                          child: new ChatView({
                            items,
                            error: appState.error,
                          }),
                        }),
                      }),
                    }),
                    new Scrollbar({
                      controller: this.scrollController,
                      thumbColor: scrollThumbColor,
                      trackColor: scrollTrackColor,
                    }),
                  ],
                }),
          }),

          // Bottom grid — input area with 4-corner overlay status (Amp: ContainerWithOverlays)
          new BottomGrid({
            onSubmit: (text: string) => {
              this.promptHistory.push(text);
              this.widget.onSubmit(text);
            },
            isProcessing: appState.isProcessing,
            currentMode: appState.currentMode ?? 'smart',
            cwd: appState.cwd,
            gitBranch: appState.gitBranch ?? undefined,
            tokenUsage: appState.usage ?? undefined,
            skillCount: appState.skillCount,
          }),
        ],
      }),
    });

    // Overlay priority: permission dialog > command palette > none
    let result: Widget = mainContent;

    if (appState.hasPendingPermission) {
      const request = appState.permissionRequest!;
      result = new Stack({
        fit: 'expand',
        children: [
          mainContent,
          new Positioned({
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            child: new PermissionDialog({
              request,
              onSelect: (optionId: string) => {
                appState.resolvePermission(optionId);
              },
              onCancel: () => {
                appState.resolvePermission(null);
              },
            }),
          }),
        ],
      });
    } else if (this.showCommandPalette) {
      result = new Stack({
        fit: 'expand',
        children: [
          mainContent,
          new Positioned({
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            child: new CommandPalette({
              onExecute: (command: string) => {
                this.setState(() => { this.showCommandPalette = false; });
                switch (command) {
                  case 'clear':
                    appState.conversation.clear();
                    break;
                  case 'toggle-tools':
                    appState.conversation.toggleToolCalls();
                    break;
                  case 'toggle-thinking':
                    this.toggleThinking(appState);
                    break;
                }
              },
              onDismiss: () => {
                this.setState(() => { this.showCommandPalette = false; });
              },
            }),
          }),
        ],
      });
    } else if (this.showFilePicker && this.fileList.length > 0) {
      result = new Stack({
        fit: 'expand',
        children: [
          mainContent,
          new Positioned({
            left: 1,
            bottom: 3,
            child: new FilePicker({
              files: this.fileList,
              onSelect: (_filePath: string) => {
                this.setState(() => { this.showFilePicker = false; });
                // TODO: insert @filePath into InputArea text when controller is exposed
              },
              onDismiss: () => {
                this.setState(() => { this.showFilePicker = false; });
              },
            }),
          }),
        ],
      });
    }

    return new AmpThemeProvider({
      theme: createAmpTheme(darkBaseTheme),
      child: result,
    });
  }
}

// --- Bootstrap ---

export async function startTUI(
  appState: AppState,
  onSubmit: (text: string) => void,
  onCancel: () => void,
): Promise<WidgetsBinding> {
  const app = new App({ appState, onSubmit, onCancel });
  return runApp(app, {
    output: process.stdout,
    terminal: true,
    errorLogger: log.error,
  });
}
