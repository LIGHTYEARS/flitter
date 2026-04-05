// Tests for contextual status message utility (I13).

import { describe, it, expect } from 'bun:test';
import { getStatusMessage, type StatusSession } from '../utils/status-message';

describe('getStatusMessage (I13)', () => {
  it('returns "Ready" for idle', () => {
    expect(getStatusMessage({ lifecycle: 'idle' })).toBe('Ready');
  });

  it('returns "Thinking..." for streaming', () => {
    expect(getStatusMessage({ lifecycle: 'streaming' })).toBe('Thinking...');
  });

  it('returns "Processing..." for processing without active tools', () => {
    expect(getStatusMessage({ lifecycle: 'processing' })).toBe('Processing...');
  });

  it('returns "Processing..." for processing with empty tool array', () => {
    expect(getStatusMessage({ lifecycle: 'processing', activeToolCalls: [] })).toBe('Processing...');
  });

  it('returns "Running tool: X" for processing with active tool calls', () => {
    const session: StatusSession = {
      lifecycle: 'processing',
      activeToolCalls: ['Bash'],
    };
    expect(getStatusMessage(session)).toBe('Running tool: Bash');
  });

  it('returns first tool name when multiple tools are active', () => {
    const session: StatusSession = {
      lifecycle: 'processing',
      activeToolCalls: ['Read', 'Write', 'Bash'],
    };
    expect(getStatusMessage(session)).toBe('Running tool: Read');
  });

  it('returns "Running tools..." for tool_execution without active tools', () => {
    expect(getStatusMessage({ lifecycle: 'tool_execution' })).toBe('Running tools...');
  });

  it('returns "Running tool: X" for tool_execution with active tools', () => {
    const session: StatusSession = {
      lifecycle: 'tool_execution',
      activeToolCalls: ['Grep'],
    };
    expect(getStatusMessage(session)).toBe('Running tool: Grep');
  });

  it('returns "Done" for complete', () => {
    expect(getStatusMessage({ lifecycle: 'complete' })).toBe('Done');
  });

  it('returns "Error" for error', () => {
    expect(getStatusMessage({ lifecycle: 'error' })).toBe('Error');
  });

  it('returns "Cancelled" for cancelled', () => {
    expect(getStatusMessage({ lifecycle: 'cancelled' })).toBe('Cancelled');
  });

  // -----------------------------------------------------------------------
  // AMP sub-state: activeToolName overrides
  // -----------------------------------------------------------------------

  describe('activeToolName overrides', () => {
    it('returns "Executing command..." when activeToolName is Bash', () => {
      const session: StatusSession = {
        lifecycle: 'tool_execution',
        activeToolName: 'Bash',
      };
      expect(getStatusMessage(session)).toBe('Executing command...');
    });

    it('returns "Executing command..." for Bash during processing', () => {
      const session: StatusSession = {
        lifecycle: 'processing',
        activeToolName: 'Bash',
      };
      expect(getStatusMessage(session)).toBe('Executing command...');
    });

    it('Bash activeToolName takes priority over activeToolCalls', () => {
      const session: StatusSession = {
        lifecycle: 'tool_execution',
        activeToolName: 'Bash',
        activeToolCalls: ['Bash'],
      };
      expect(getStatusMessage(session)).toBe('Executing command...');
    });

    it('returns "Running sub-agent..." when activeToolName is Task', () => {
      const session: StatusSession = {
        lifecycle: 'tool_execution',
        activeToolName: 'Task',
      };
      expect(getStatusMessage(session)).toBe('Running sub-agent...');
    });

    it('returns "Running sub-agent..." for Task during processing', () => {
      const session: StatusSession = {
        lifecycle: 'processing',
        activeToolName: 'Task',
      };
      expect(getStatusMessage(session)).toBe('Running sub-agent...');
    });

    it('falls back to activeToolCalls for non-special tool names', () => {
      const session: StatusSession = {
        lifecycle: 'tool_execution',
        activeToolName: 'Read',
        activeToolCalls: ['Read'],
      };
      expect(getStatusMessage(session)).toBe('Running tool: Read');
    });

    it('falls back to generic message when activeToolName is non-special and no activeToolCalls', () => {
      const session: StatusSession = {
        lifecycle: 'tool_execution',
        activeToolName: 'Read',
      };
      expect(getStatusMessage(session)).toBe('Running tools...');
    });
  });

  // -----------------------------------------------------------------------
  // AMP sub-state: isCompacting
  // -----------------------------------------------------------------------

  describe('isCompacting', () => {
    it('returns "Compacting context..." when isCompacting is true', () => {
      const session: StatusSession = {
        lifecycle: 'processing',
        isCompacting: true,
      };
      expect(getStatusMessage(session)).toBe('Compacting context...');
    });

    it('compacting overrides activeToolName', () => {
      const session: StatusSession = {
        lifecycle: 'tool_execution',
        activeToolName: 'Bash',
        isCompacting: true,
      };
      expect(getStatusMessage(session)).toBe('Compacting context...');
    });

    it('compacting overrides streaming lifecycle', () => {
      const session: StatusSession = {
        lifecycle: 'streaming',
        isCompacting: true,
      };
      expect(getStatusMessage(session)).toBe('Compacting context...');
    });

    it('compacting overrides idle lifecycle', () => {
      const session: StatusSession = {
        lifecycle: 'idle',
        isCompacting: true,
      };
      expect(getStatusMessage(session)).toBe('Compacting context...');
    });

    it('does not trigger when isCompacting is false', () => {
      const session: StatusSession = {
        lifecycle: 'processing',
        isCompacting: false,
      };
      expect(getStatusMessage(session)).toBe('Processing...');
    });
  });

  // -----------------------------------------------------------------------
  // AMP sub-state: contextUsagePercent warning
  // -----------------------------------------------------------------------

  describe('contextUsagePercent warning', () => {
    it('appends "(high context usage)" when percent > 80 during streaming', () => {
      const session: StatusSession = {
        lifecycle: 'streaming',
        contextUsagePercent: 85,
      };
      expect(getStatusMessage(session)).toBe('Thinking... (high context usage)');
    });

    it('appends warning when percent > 80 during processing', () => {
      const session: StatusSession = {
        lifecycle: 'processing',
        contextUsagePercent: 95,
      };
      expect(getStatusMessage(session)).toBe('Processing... (high context usage)');
    });

    it('appends warning when percent > 80 during tool_execution', () => {
      const session: StatusSession = {
        lifecycle: 'tool_execution',
        activeToolCalls: ['Grep'],
        contextUsagePercent: 81,
      };
      expect(getStatusMessage(session)).toBe('Running tool: Grep (high context usage)');
    });

    it('appends warning to Bash sub-state message', () => {
      const session: StatusSession = {
        lifecycle: 'tool_execution',
        activeToolName: 'Bash',
        contextUsagePercent: 90,
      };
      expect(getStatusMessage(session)).toBe('Executing command... (high context usage)');
    });

    it('appends warning to Task sub-state message', () => {
      const session: StatusSession = {
        lifecycle: 'processing',
        activeToolName: 'Task',
        contextUsagePercent: 99,
      };
      expect(getStatusMessage(session)).toBe('Running sub-agent... (high context usage)');
    });

    it('does not append warning when percent is exactly 80', () => {
      const session: StatusSession = {
        lifecycle: 'streaming',
        contextUsagePercent: 80,
      };
      expect(getStatusMessage(session)).toBe('Thinking...');
    });

    it('does not append warning when percent is below 80', () => {
      const session: StatusSession = {
        lifecycle: 'processing',
        contextUsagePercent: 50,
      };
      expect(getStatusMessage(session)).toBe('Processing...');
    });

    it('does not append warning when percent is undefined', () => {
      expect(getStatusMessage({ lifecycle: 'streaming' })).toBe('Thinking...');
    });

    it('does not append warning for idle lifecycle', () => {
      const session: StatusSession = {
        lifecycle: 'idle',
        contextUsagePercent: 99,
      };
      expect(getStatusMessage(session)).toBe('Ready');
    });

    it('does not append warning for complete lifecycle', () => {
      const session: StatusSession = {
        lifecycle: 'complete',
        contextUsagePercent: 99,
      };
      expect(getStatusMessage(session)).toBe('Done');
    });

    it('compacting takes priority over context warning', () => {
      const session: StatusSession = {
        lifecycle: 'processing',
        isCompacting: true,
        contextUsagePercent: 99,
      };
      expect(getStatusMessage(session)).toBe('Compacting context...');
    });
  });
});
