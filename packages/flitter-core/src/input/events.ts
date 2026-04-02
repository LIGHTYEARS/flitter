// Input event types — discriminated union for terminal input events
// Amp ref: input-system.md Section 5.2, Section 6.1

export interface KeyEvent {
  readonly type: 'key';
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly sequence?: string;
}

export interface MouseEvent {
  readonly type: 'mouse';
  readonly action: 'press' | 'release' | 'move' | 'scroll';
  readonly button: number;
  readonly x: number;
  readonly y: number;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

export interface ResizeEvent {
  readonly type: 'resize';
  readonly width: number;
  readonly height: number;
}

export interface FocusEvent {
  readonly type: 'focus';
  readonly focused: boolean;
}

export interface PasteEvent {
  readonly type: 'paste';
  readonly text: string;
}

export interface ImagePasteEvent {
  readonly type: 'image_paste';
  readonly data: string;
  readonly mimeType: string;
}

export interface TerminalResponseEvent {
  readonly type: 'terminal_response';
  readonly responseType: 'da1' | 'da2' | 'da3' | 'dsr' | 'decrpm' | 'xtversion' | 'fg_color' | 'bg_color' | 'kitty_keyboard' | 'kitty_graphics' | 'osc_generic' | 'dcs_generic';
  readonly raw: string;
  readonly payload: string;
}

export type InputEvent = KeyEvent | MouseEvent | ResizeEvent | FocusEvent | PasteEvent | ImagePasteEvent | TerminalResponseEvent;

export type KeyEventResult = 'handled' | 'ignored';

export function createKeyEvent(key: string, options?: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; metaKey?: boolean; sequence?: string }): KeyEvent {
  return { type: 'key', key, ctrlKey: options?.ctrlKey ?? false, altKey: options?.altKey ?? false, shiftKey: options?.shiftKey ?? false, metaKey: options?.metaKey ?? false, sequence: options?.sequence };
}

export function createMouseEvent(action: MouseEvent['action'], button: number, x: number, y: number, options?: { ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean }): MouseEvent {
  return { type: 'mouse', action, button, x, y, ctrlKey: options?.ctrlKey ?? false, altKey: options?.altKey ?? false, shiftKey: options?.shiftKey ?? false };
}

export function createResizeEvent(width: number, height: number): ResizeEvent {
  return { type: 'resize', width, height };
}

export function createFocusEvent(focused: boolean): FocusEvent {
  return { type: 'focus', focused };
}

export function createPasteEvent(text: string): PasteEvent {
  return { type: 'paste', text };
}

export function createImagePasteEvent(data: string, mimeType: string = 'image/png'): ImagePasteEvent {
  return { type: 'image_paste', data, mimeType };
}

export function createTerminalResponseEvent(responseType: TerminalResponseEvent['responseType'], raw: string, payload: string): TerminalResponseEvent {
  return { type: 'terminal_response', responseType, raw, payload };
}
