// Tests for Terminal Capability Detection Wiring (Gap R10)
// Covers: MediaQueryData.fromPlatformCapabilities, fromTerminal with caps,
//         TerminalManager.updateCapabilities, onCapabilitiesChanged

import { describe, it, expect } from 'bun:test';
import { MediaQueryData } from '../media-query';
import type { TerminalCapabilities as PlatformCapabilities } from '../../terminal/platform';
import { TerminalManager } from '../../terminal/terminal-manager';
import { MockPlatform } from '../../terminal/platform';

// ---------------------------------------------------------------------------
// MediaQueryData.fromPlatformCapabilities
// ---------------------------------------------------------------------------

describe('MediaQueryData.fromPlatformCapabilities', () => {
  it('maps trueColor to truecolor colorDepth', () => {
    const platformCaps: PlatformCapabilities = {
      trueColor: true,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: true,
      unicode: true,
      hyperlinks: true,
      kittyGraphics: true,
    };
    const mqCaps = MediaQueryData.fromPlatformCapabilities(platformCaps);
    expect(mqCaps.colorDepth).toBe('truecolor');
    expect(mqCaps.mouseSupport).toBe(true);
    expect(mqCaps.kittyGraphics).toBe(true);
  });

  it('maps ansi256 without trueColor to ansi256 colorDepth', () => {
    const platformCaps: PlatformCapabilities = {
      trueColor: false,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: false,
      unicode: true,
      hyperlinks: false,
    };
    const mqCaps = MediaQueryData.fromPlatformCapabilities(platformCaps);
    expect(mqCaps.colorDepth).toBe('ansi256');
    expect(mqCaps.mouseSupport).toBe(true);
  });

  it('maps no color support to none colorDepth', () => {
    const platformCaps: PlatformCapabilities = {
      trueColor: false,
      ansi256: false,
      mouse: false,
      altScreen: false,
      syncOutput: false,
      unicode: false,
      hyperlinks: false,
    };
    const mqCaps = MediaQueryData.fromPlatformCapabilities(platformCaps);
    expect(mqCaps.colorDepth).toBe('none');
    expect(mqCaps.mouseSupport).toBe(false);
    expect(mqCaps.kittyGraphics).toBe(false);
    expect(mqCaps.emojiWidth).toBe('unknown');
  });

  it('maps emojiWidth boolean true to wide', () => {
    const platformCaps: PlatformCapabilities = {
      trueColor: false,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: false,
      unicode: true,
      hyperlinks: false,
      emojiWidth: true,
    };
    expect(
      MediaQueryData.fromPlatformCapabilities(platformCaps).emojiWidth,
    ).toBe('wide');
  });

  it('maps emojiWidth undefined to unknown', () => {
    const platformCaps: PlatformCapabilities = {
      trueColor: false,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: false,
      unicode: true,
      hyperlinks: false,
    };
    expect(
      MediaQueryData.fromPlatformCapabilities(platformCaps).emojiWidth,
    ).toBe('unknown');
  });

  it('maps kittyGraphics undefined to false', () => {
    const platformCaps: PlatformCapabilities = {
      trueColor: true,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: true,
      unicode: true,
      hyperlinks: true,
      // kittyGraphics not set
    };
    expect(
      MediaQueryData.fromPlatformCapabilities(platformCaps).kittyGraphics,
    ).toBe(false);
  });

  it('maps kittyGraphics true', () => {
    const platformCaps: PlatformCapabilities = {
      trueColor: true,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: true,
      unicode: true,
      hyperlinks: true,
      kittyGraphics: true,
    };
    expect(
      MediaQueryData.fromPlatformCapabilities(platformCaps).kittyGraphics,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MediaQueryData.fromTerminal with platform capabilities
// ---------------------------------------------------------------------------

describe('MediaQueryData.fromTerminal with platformCaps', () => {
  it('creates with default capabilities when no platformCaps', () => {
    const data = MediaQueryData.fromTerminal(80, 24);
    expect(data.capabilities.colorDepth).toBe('ansi256');
    expect(data.capabilities.mouseSupport).toBe(false);
    expect(data.capabilities.emojiWidth).toBe('unknown');
    expect(data.capabilities.kittyGraphics).toBe(false);
  });

  it('creates with real capabilities when platformCaps provided', () => {
    const platformCaps: PlatformCapabilities = {
      trueColor: true,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: true,
      unicode: true,
      hyperlinks: true,
      kittyGraphics: true,
      emojiWidth: true,
    };
    const data = MediaQueryData.fromTerminal(120, 40, platformCaps);
    expect(data.size.width).toBe(120);
    expect(data.size.height).toBe(40);
    expect(data.capabilities.colorDepth).toBe('truecolor');
    expect(data.capabilities.mouseSupport).toBe(true);
    expect(data.capabilities.kittyGraphics).toBe(true);
    expect(data.capabilities.emojiWidth).toBe('wide');
  });

  it('backward compatible -- existing callers without caps still work', () => {
    const data = MediaQueryData.fromTerminal(132, 50);
    expect(data.size.width).toBe(132);
    expect(data.size.height).toBe(50);
    expect(data.capabilities.colorDepth).toBe('ansi256');
  });
});

// ---------------------------------------------------------------------------
// TerminalManager.updateCapabilities
// ---------------------------------------------------------------------------

describe('TerminalManager.updateCapabilities', () => {
  it('updates capabilities and notifies callback', () => {
    const platform = new MockPlatform();
    const tm = new TerminalManager(platform);

    const originalCaps = tm.capabilities;

    const newCaps: PlatformCapabilities = {
      ...originalCaps,
      kittyGraphics: true,
      trueColor: true,
    };

    let callbackCalled = false;
    let receivedCaps: PlatformCapabilities | null = null;

    tm.onCapabilitiesChanged = (caps) => {
      callbackCalled = true;
      receivedCaps = caps;
    };

    tm.updateCapabilities(newCaps);

    expect(callbackCalled).toBe(true);
    expect(receivedCaps).toBe(newCaps);
    expect(tm.capabilities.kittyGraphics).toBe(true);
    expect(tm.capabilities.trueColor).toBe(true);
  });

  it('works without callback set', () => {
    const platform = new MockPlatform();
    const tm = new TerminalManager(platform);

    const newCaps: PlatformCapabilities = {
      ...tm.capabilities,
      trueColor: true,
    };

    // Should not throw
    tm.updateCapabilities(newCaps);
    expect(tm.capabilities.trueColor).toBe(true);
  });

  it('initial capabilities are detected from environment', () => {
    const platform = new MockPlatform();
    const tm = new TerminalManager(platform);

    // The constructor calls detectCapabilities(), so capabilities should exist
    const caps = tm.capabilities;
    expect(caps).toBeDefined();
    expect(typeof caps.trueColor).toBe('boolean');
    expect(typeof caps.ansi256).toBe('boolean');
    expect(typeof caps.mouse).toBe('boolean');
  });
});
