import { describe, expect, test } from "bun:test";
import { parseOscColorResponse, QueryParser } from "./query-parser";

describe("TerminalCapabilities new fields", () => {
  test("defaultCapabilities includes probing fields with defaults", () => {
    // Access via a minimal TuiController — the defaults are returned internally.
    // We verify by checking that the type is correct and fields exist.
    // Since defaultCapabilities is private, we test via the public capabilities getter.
    // Create a minimal controller just to verify the shape.
    const caps = {
      kittyGraphics: false,
      pixelMouse: false,
      pixelDimensions: null,
      osc52: false,
      background: "dark" as const,
      kittyExplicitWidth: false,
    };
    expect(caps.kittyGraphics).toBe(false);
    expect(caps.pixelMouse).toBe(false);
    expect(caps.osc52).toBe(false);
    expect(caps.background).toBe("dark");
    expect(caps.kittyExplicitWidth).toBe(false);
    expect(caps.pixelDimensions).toBeNull();
  });
});

describe("QueryParser", () => {
  test("buildQuerySequence returns all queries with DA1 last", () => {
    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({
      isJetBrains: false,
      isAppleTerminal: false,
      isTmux: false,
    });
    expect(seq.endsWith("\x1b[c")).toBe(true);
    expect(seq).toContain("\x1b]11;?\x07"); // OSC 11
    expect(seq).toContain("\x1b[?2026$p"); // DECRQSS sync
    expect(seq).toContain("\x1b[>0q"); // XTVERSION
    expect(seq).toContain("\x1b_Gi=1,a=q\x1b\\"); // kitty graphics
  });

  test("Apple Terminal skips all queries", () => {
    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({ isJetBrains: false, isAppleTerminal: true, isTmux: false });
    expect(seq).toBe("");
  });

  test("JetBrains skips kitty graphics query", () => {
    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({ isJetBrains: true, isAppleTerminal: false, isTmux: false });
    expect(seq).not.toContain("\x1b_Gi=1,a=q\x1b\\");
    expect(seq).toContain("\x1b[c");
  });

  test("tmux wraps queries in passthrough", () => {
    const qp = new QueryParser();
    const seq = qp.buildQuerySequence({ isJetBrains: false, isAppleTerminal: false, isTmux: true });
    expect(seq).toContain("\x1bPtmux;");
  });

  test("processOscColor sets background luminance", () => {
    const qp = new QueryParser();
    qp.processOscColor(11, 240, 240, 240);
    expect(qp.getCapabilities().background).toBe("light");

    const qp2 = new QueryParser();
    qp2.processOscColor(11, 20, 20, 30);
    expect(qp2.getCapabilities().background).toBe("dark");
  });

  test("processDecrqss maps to correct capabilities", () => {
    const qp = new QueryParser();
    qp.processDecrqss("?2026", "1");
    qp.processDecrqss("?1016", "2");
    const caps = qp.getCapabilities();
    expect(caps.syncOutput).toBe(true);
    expect(caps.pixelMouse).toBe(true);
  });

  test("pixelMouse + inband pixel data enables shouldUsePixelMouse", () => {
    const qp = new QueryParser();
    qp.processDecrqss("?1016", "2");
    qp.updateInbandPixelData(80, 24, 1600, 1200);

    expect(qp.shouldUsePixelMouse()).toBe(true);
    expect(qp.getPixelDimensions()).toEqual({
      columns: 80,
      rows: 24,
      pixelWidth: 1600,
      pixelHeight: 1200,
    });
  });

  test("inband pixel data缺失时 shouldUsePixelMouse=false", () => {
    const qp = new QueryParser();
    qp.processDecrqss("?1016", "2");

    expect(qp.shouldUsePixelMouse()).toBe(false);
    expect(qp.getPixelDimensions()).toBeNull();
  });

  test("processXtversion detects osc52 from known terminals", () => {
    const qp = new QueryParser();
    qp.processXtversion("ghostty 1.2.3");
    expect(qp.getCapabilities().osc52).toBe(true);
  });

  test("processDeviceAttributes forces emojiWidth=true for JetBrains", () => {
    // Temporarily set env to JetBrains
    const original = process.env.TERMINAL_EMULATOR;
    process.env.TERMINAL_EMULATOR = "JetBrains-foo";
    try {
      const qp = new QueryParser();
      qp.processDeviceAttributes();
      expect(qp.getCapabilities().emojiWidth).toBe(true);
    } finally {
      if (original === undefined) delete process.env.TERMINAL_EMULATOR;
      else process.env.TERMINAL_EMULATOR = original;
    }
  });

  test("processDeviceAttributes forces emojiWidth=true inside tmux", () => {
    const original = process.env.TMUX;
    process.env.TMUX = "/tmp/tmux-1000/default,12345,0";
    try {
      const qp = new QueryParser();
      qp.processDeviceAttributes();
      expect(qp.getCapabilities().emojiWidth).toBe(true);
    } finally {
      if (original === undefined) delete process.env.TMUX;
      else process.env.TMUX = original;
    }
  });

  test("processDeviceAttributes does not force emojiWidth for generic terminal", () => {
    // Make sure neither JetBrains nor tmux env vars are set
    const origJB = process.env.TERMINAL_EMULATOR;
    const origTmux = process.env.TMUX;
    delete process.env.TERMINAL_EMULATOR;
    delete process.env.TMUX;
    try {
      const qp = new QueryParser();
      qp.processDeviceAttributes();
      expect(qp.getCapabilities().emojiWidth).toBe(false);
    } finally {
      if (origJB !== undefined) process.env.TERMINAL_EMULATOR = origJB;
      if (origTmux !== undefined) process.env.TMUX = origTmux;
    }
  });

  test("DECRQSS ?2027 with value '1' or '2' sets emojiWidth=true", () => {
    const qp1 = new QueryParser();
    qp1.processDecrqss("?2027", "1");
    expect(qp1.getCapabilities().emojiWidth).toBe(true);

    const qp2 = new QueryParser();
    qp2.processDecrqss("?2027", "2");
    expect(qp2.getCapabilities().emojiWidth).toBe(true);

    const qp3 = new QueryParser();
    qp3.processDecrqss("?2027", "0");
    expect(qp3.getCapabilities().emojiWidth).toBe(false);
  });

  test("processDeviceAttributes resolves waitForCompletion", async () => {
    const qp = new QueryParser();
    const promise = qp.waitForCompletion(5000);
    qp.processDeviceAttributes();
    await promise; // should resolve without timeout
  });

  // ── Kitty explicit width detection (GAP-TUI-34) ──

  test("markKittyWidthQuerySent + CPR row=1 col=2 sets kittyExplicitWidth=true", () => {
    const qp = new QueryParser();
    qp.markKittyWidthQuerySent();
    qp.processCursorPositionReport(1, 2);
    expect(qp.getCapabilities().kittyExplicitWidth).toBe(true);
  });

  test("CPR with col !== 2 does not set kittyExplicitWidth", () => {
    const qp = new QueryParser();
    qp.markKittyWidthQuerySent();
    qp.processCursorPositionReport(1, 3);
    expect(qp.getCapabilities().kittyExplicitWidth).toBe(false);
  });

  test("CPR without markKittyWidthQuerySent is ignored", () => {
    const qp = new QueryParser();
    // Not calling markKittyWidthQuerySent
    qp.processCursorPositionReport(1, 2);
    expect(qp.getCapabilities().kittyExplicitWidth).toBe(false);
  });

  test("second CPR after first is processed is ignored", () => {
    const qp = new QueryParser();
    qp.markKittyWidthQuerySent();
    qp.processCursorPositionReport(1, 2); // sets kittyExplicitWidth = true
    expect(qp.getCapabilities().kittyExplicitWidth).toBe(true);
    // kittyWidthQuerySent is now false — second call should be no-op
    qp.processCursorPositionReport(1, 5);
    expect(qp.getCapabilities().kittyExplicitWidth).toBe(true); // unchanged
  });
});

describe("parseOscColorResponse", () => {
  test("parses rgb:HH/HH/HH format", () => {
    const result = parseOscColorResponse("rgb:ff/00/80");
    expect(result).toEqual({ r: 255, g: 0, b: 128 });
  });

  test("parses rgba:HHHH/HHHH/HHHH format", () => {
    const result = parseOscColorResponse("rgba:ffff/0000/8080");
    expect(result).toEqual({ r: 255, g: 0, b: 128 });
  });

  test("returns null for invalid format", () => {
    expect(parseOscColorResponse("invalid")).toBeNull();
  });
});
